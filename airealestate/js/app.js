// Charlotte Coordinates
const CHARLOTTE_COORDS = [35.2271, -80.8431];
const INITIAL_ZOOM = 12;

// 0. Safety Wrapper & Diagnostics
function showDiagnostic(msg) {
    const intro = document.getElementById('intro-text');
    if (!intro) return;

    let statusEl = document.getElementById('js-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'js-status';
        statusEl.className = 'mt-2 p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100 font-mono';
        intro.appendChild(statusEl);
    }
    statusEl.textContent = "Status: " + msg;
    console.log("DIAGNOSTIC:", msg);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupUI();
    showDiagnostic("Ready (v8 - SVG Fix Applied)");
});

let map;
let layers = {
    rezoning: null,
    transit: null,
    cip: null,
    crime: null
};

function initMap() {
    // 1. Initialize Map
    map = L.map('map').setView(CHARLOTTE_COORDS, INITIAL_ZOOM);

    // 2. Add Base Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 3. Load Initial Data
    loadLayer('rezonings', 'rezoning', renderRezoningLayer);
    loadLayer('transit_projects', 'transit', renderTransitLayer, false); // Default off
    loadLayer('cip_projects', 'cip', renderCIPLayer, false); // Default off
    loadLayer('cmpd_incidents', 'crime', renderCrimeHeatmap, false); // Default off
}

async function loadLayer(fileName, layerKey, renderFunction, addToMap = true) {
    try {
        const response = await fetch(`data/${fileName}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        layers[layerKey] = renderFunction(data);

        if (addToMap && layers[layerKey]) {
            layers[layerKey].addTo(map);
        }
    } catch (error) {
        console.warn(`Failed to load ${fileName}:`, error);
    }
}

// --- Renderers ---

function renderRezoningLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#3b82f6", // Blue
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.6
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'rezoning')
    });
}

function renderTransitLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#eab308", // Yellow
            weight: 1,
            opacity: 1,
            color: '#a16207',
            fillOpacity: 0.6
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'transit')
    });
}

function renderCIPLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#22c55e", // Green
            weight: 1,
            opacity: 1,
            color: '#15803d',
            fillOpacity: 0.6
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'cip')
    });
}

function renderCrimeHeatmap(geoJsonData) {
    // Create a layer group to hold both heatmap and clickable markers
    const crimeLayerGroup = L.layerGroup();

    // 1. Create heatmap for visualization
    const points = geoJsonData.features.map(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        return [lat, lng, 0.5];
    });

    const heatmapLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' },
        pane: 'heatmapPane' // Use non-interactive pane
    });

    // Fix: Set pointer-events directly on the canvas element
    heatmapLayer.on('add', function (e) {
        const container = e.target.getPane();
        if (container) {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.pointerEvents = 'none';
            }
        }
    });

    // 2. Create visible clickable markers for interaction (Red Dots)
    // FORCE SVG rendering in the markerPane (z-index 600) to ensure they sit above the heatmap (z-index 350)
    const markerRenderer = L.svg({ pane: 'markerPane' });

    const markersLayer = L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                renderer: markerRenderer, // Force SVG renderer
                interactive: true,
                radius: 6,
                fillColor: '#ef4444', // Red
                color: '#991b1b', // Dark Red border
                weight: 1,
                fillOpacity: 0.9
            });
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'crime')
    });

    // Add both layers to the group
    crimeLayerGroup.addLayer(heatmapLayer);
    crimeLayerGroup.addLayer(markersLayer);

    return crimeLayerGroup;
}

function onEachFeature(feature, layer, type) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: (e) => resetHighlight(e, type),
        click: (e) => {
            zoomToFeature(e);
            updateSidebar(feature.properties, type);
        }
    });
}

// --- Interaction ---

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 4,
        color: '#333',
        dashArray: '',
        fillOpacity: 0.9
    });
    layer.bringToFront();
}

function resetHighlight(e, type) {
    const layer = e.target;
    // Reset to original style based on type
    if (type === 'rezoning') {
        layers.rezoning.resetStyle(layer);
    } else if (type === 'transit') {
        layers.transit.resetStyle(layer);
    } else if (type === 'cip') {
        layers.cip.resetStyle(layer);
    }
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

// --- Sidebar Content ---

function updateSidebar(props, type) {
    const panel = document.getElementById('details-panel');
    const intro = document.getElementById('intro-text');

    panel.classList.remove('hidden');
    intro.classList.add('hidden');

    // Default fields
    let title = "Unknown Project";
    let status = "N/A";
    let desc = "No description.";
    let details = {};

    if (type === 'rezoning') {
        title = `Petition ${props.Petition || props.PETITION || "N/A"}`;
        status = props.Status || props.STATUS || "Unknown";
        desc = props.RezoningReason || props.REZONING_REASON || props.ProjName || "No description available.";
        details = {
            "Petitioner": props.Petitioner || props.PETITIONER,
            "Existing Zoning": props.ExistingZoning || props.EXISTING_ZONING,
            "Proposed Zoning": props.ProposedZoning || props.PROPOSED_ZONING
        };
    } else if (type === 'transit') {
        title = props.ProjectName || props.Station || "Transit Project";
        status = props.Status || "Unknown";
        desc = props.Notes || "No notes.";
        details = {
            "Corridor": props.Corridor,
            "Developer": props.Developer,
            "Land Use": props.LandUse,
            "Res. Units": props.ResidentialUnits
        };
    } else if (type === 'cip') {
        title = props.ProjectName || "Capital Project";
        status = "In Progress"; // Since we fetched from 'In-Progress' layer
        desc = props.ProjectDesc || "No description.";
        details = {
            "Department": props.Department,
            "Cost": props.TotalBudget ? `$${props.TotalBudget}` : "N/A"
        };
    }

    // Render Logic
    document.getElementById('prop-petition').textContent = title;

    // Status Badge
    const statusEl = document.getElementById('prop-status');
    statusEl.textContent = status;
    statusEl.className = "inline-block px-2 py-1 text-xs font-semibold rounded mb-4 bg-gray-200 text-gray-800"; // Default
    if (status.toLowerCase().includes('approved') || status.toLowerCase().includes('complete')) {
        statusEl.classList.add('bg-green-100', 'text-green-800');
    } else if (status.toLowerCase().includes('denied') || status.toLowerCase().includes('withdraw')) {
        statusEl.classList.add('bg-red-100', 'text-red-800');
    }

    document.getElementById('prop-notes').textContent = desc;

    // Dynamic Builder for Details - Mobile optimized
    const container = document.getElementById('details-container');
    container.innerHTML = ''; // Clear previous

    for (const [key, value] of Object.entries(details)) {
        if (value) {
            const div = document.createElement('div');
            div.className = 'pb-3 border-b border-gray-100 last:border-0';
            div.innerHTML = `
                <div class="text-xs text-gray-500 font-medium mb-1">${key}</div>
                <div class="text-sm text-gray-900">${value}</div>
            `;
            container.appendChild(div);
        }
    }

    // Add description at the end
    if (desc && desc !== "No description.") {
        const descDiv = document.createElement('div');
        descDiv.className = 'pt-2';
        descDiv.innerHTML = `
            <div class="text-xs text-gray-500 font-medium mb-1">Description</div>
            <div class="text-sm text-gray-700 leading-relaxed">${desc}</div>
        `;
        container.appendChild(descDiv);
    }

    // Open sidebar on mobile
    if (window.innerWidth < 640) {
        document.getElementById('sidebar').classList.remove('-translate-x-full');
    }
}

function setupUI() {
    // Sidebar Controls
    document.getElementById('close-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('-translate-x-full');
    });
    document.getElementById('open-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('-translate-x-full');
    });

    // Layer Toggles
    setupLayerToggle('layer-rezoning', 'rezoning');
    setupLayerToggle('layer-transit', 'transit');
    setupLayerToggle('layer-cip', 'cip');
    setupLayerToggle('layer-crime', 'crime');
}

function setupLayerToggle(id, layerKey) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('change', (e) => {
        if (e.target.checked) {
            if (layers[layerKey]) layers[layerKey].addTo(map);
        } else {
            if (layers[layerKey]) map.removeLayer(layers[layerKey]);
        }
    });
}
