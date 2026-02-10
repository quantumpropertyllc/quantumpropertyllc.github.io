// Charlotte Coordinates
const CHARLOTTE_COORDS = [35.2271, -80.8431];
const INITIAL_ZOOM = 12;

// 0. Safety Wrapper & Diagnostics (RESTORED FOR V11)
// 0. Safety Wrapper - Cleaned for Production
function showDiagnostic(msg) {
    // Disabled for production
    // console.log("DIAGNOSTIC:", msg);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupUI();
    // showDiagnostic("Ready");
});

// ... (map init and layers objects remain same) ...

let map;
let layers = {
    rezoning: null,
    transit: null,
    cip: null,
    crime: null,
    schools: null,
    stations: null,
    opportunity: null,
    plan2040: null,
    flood: null,
    zoning: null
};

// Raw data storage for spatial analysis (V11)
let rawData = {
    rezoning: null,
    transit: null,
    cip: null,
    crime: null,
    schools: null,
    stations: null,
    opportunity: null,
    plan2040: null,
    flood: null,
    zoning: null
};

function initMap() {
    // 1. Initialize Map
    map = L.map('map', {
        zoomControl: false
    }).setView(CHARLOTTE_COORDS, INITIAL_ZOOM);

    // 1.5 Add Zoom Control to Top Right
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Map click - close sidebar or show point score
    map.on('click', (e) => {
        showDiagnostic(`Map Click: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);

        // V11: Show score for ANY point clicked
        const panel = document.getElementById('details-panel');
        const intro = document.getElementById('intro-text');

        // If clicking empty space, we clear specific feature details but keep the panel open for the score
        panel.classList.remove('hidden');
        intro.classList.add('hidden');

        // Reset feature details
        document.getElementById('prop-petition').textContent = "Selected Location";
        document.getElementById('prop-status').textContent = "Map Point";
        document.getElementById('prop-status').className = "inline-block px-2 py-1 text-xs font-semibold rounded mb-4 bg-blue-50 text-blue-700";
        document.getElementById('details-container').innerHTML = `<div class="text-sm text-gray-500 italic">Click a specific map feature (colored areas) to see property-specific records.</div>`;

        calculateInvestmentScore(e.latlng);
        showSidebar();
    });

    // 2. Add Base Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 3. Load Initial Data
    loadLayer('planning/rezonings', 'rezoning', renderRezoningLayer);
    loadLayer('infrastructure/transit_projects', 'transit', renderTransitLayer, false);
    loadLayer('infrastructure/cip_projects', 'cip', renderCIPLayer, false);
    loadLayer('risk/cmpd_incidents', 'crime', renderCrimeHeatmap, false);

    // New Layers
    loadLayer('development/school_districts', 'schools', renderSchoolsLayer, false);
    loadLayer('infrastructure/transit_stations', 'stations', renderStationsLayer, false);
    loadLayer('planning/opportunity_zones', 'opportunity', renderOpportunityLayer, false);
    loadLayer('planning/charlotte_2040_plan', 'plan2040', render2040Layer, false);
    loadLayer('risk/flood_zones', 'flood', renderFloodLayer, false);
    loadLayer('planning/current_zoning', 'zoning', renderZoningLayer, false);
}

// ... (renderers unchanged until onEachFeature) ...

function onEachFeature(feature, layer, type) {
    const handleInteraction = (e) => {
        // v11 Debugging
        console.log(`Event: ${e.type} on ${type}`);
        showDiagnostic(`${e.type} on ${type}`);

        try {
            L.DomEvent.stopPropagation(e);

            // Debugging Zoom
            const target = e.target;
            if (target.getBounds) {
                showDiagnostic("Zooming to bounds...");
                map.fitBounds(target.getBounds());
            } else if (target.getLatLng) {
                showDiagnostic("Zooming to point...");
                map.setView(target.getLatLng(), 16);
            } else {
                showDiagnostic("Err: No bounds/latlng found");
            }

            // Debugging Sidebar
            updateSidebar(feature.properties, type, e.latlng);
        } catch (err) {
            console.error("Interaction Error:", err);
            showDiagnostic(`Err: ${err.message}`);
        }
    };

    layer.on({
        mouseover: highlightFeature,
        mouseout: (e) => resetHighlight(e, type),
        click: handleInteraction,
        touchstart: handleInteraction
    });
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#333',
        dashArray: '',
        fillOpacity: 0.8
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetHighlight(e, type) {
    const layerKey = type === 'plan2040' ? 'plan2040' :
        type === 'opportunity' ? 'opportunity' :
            type === 'rezoning' ? 'rezoning' : type;

    if (layers[layerKey] && layers[layerKey].resetStyle) {
        layers[layerKey].resetStyle(e.target);
    }
}

async function loadLayer(fileName, layerKey, renderFunction, addToMap = true) {
    try {
        const response = await fetch(`data/${fileName}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Store raw data for scoring
        rawData[layerKey] = data;

        layers[layerKey] = renderFunction(data);

        if (addToMap && layers[layerKey]) {
            layers[layerKey].addTo(map);
        }
    } catch (error) {
        console.warn(`Failed to load ${fileName}:`, error);
        showDiagnostic(`Load Err: ${fileName}`);
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
    const markerRenderer = L.svg({ pane: 'markerPane' });

    const markersLayer = L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
            // Confirm marker creation
            console.log("Creating marker at", latlng);
            return L.circleMarker(latlng, {
                renderer: markerRenderer,
                interactive: true,
                radius: 6,
                fillColor: '#ef4444', // Red
                color: '#991b1b', // Dark Red border
                weight: 1,
                fillOpacity: 0.9,
                pane: 'markerPane' // Explicitly set pane again just in case
            });
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'crime')
    });

    // Add both layers to the group
    crimeLayerGroup.addLayer(heatmapLayer);
    crimeLayerGroup.addLayer(markersLayer);

    return crimeLayerGroup;
}

// --- New Renderers ---

function renderSchoolsLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#9333ea", // Purple
            weight: 1,
            opacity: 1,
            color: '#7e22ce',
            fillOpacity: 0.4
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'schools')
    });
}



function renderStationsLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#4f46e5", // Indigo
                color: "#312e81",
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            });
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'stations')
    });
}

function renderOpportunityLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#ea580c", // Orange
            weight: 1,
            opacity: 1,
            color: '#c2410c',
            fillOpacity: 0.5
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'opportunity')
    });
}

function render2040Layer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#db2777", // Pink
            weight: 1,
            opacity: 1,
            color: '#be185d',
            fillOpacity: 0.5
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'plan2040')
    });
}

function renderFloodLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#06b6d4", // Cyan
            weight: 0,
            opacity: 0,
            fillOpacity: 0.5
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'flood')
    });
}

function renderZoningLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: "#4b5563", // Gray
            weight: 1,
            opacity: 1,
            color: '#374151',
            fillOpacity: 0.4
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'zoning')
    });
}



function updateSidebar(props, type, latlng) {
    const panel = document.getElementById('details-panel');
    const intro = document.getElementById('intro-text');

    panel.classList.remove('hidden');
    intro.classList.add('hidden');

    // Calculate Investment Score (V11)
    if (latlng) {
        calculateInvestmentScore(latlng);
    }

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
            "Existing Zoning": props.ExistZone || props.ExistingZoning || props.EXISTING_ZONING,
            "Proposed Zoning": props.ReqZone || props.ProposedZoning || props.PROPOSED_ZONING,
            "Acres": props.Acres || props.ACRES
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
        title = props.Project_Name || props.ProjectName || "Capital Project";
        status = props.Status || "Active";
        desc = props.Location_Description || props.ProjectDesc || "No description.";
        details = {
            "Phase": props.Project_Phase || "N/A",
            "Budget": props.Total_Project_Budget || props.TotalBudget || "N/A",
            "Manager": props.Project_Manager
        };
    } else if (type === 'crime') {
        title = "Crime Incident";

        // Defensive property access helper
        const getProp = (keys) => {
            for (const k of keys) {
                if (props[k] !== undefined) return props[k];
            }
            return null;
        };

        const dateVal = getProp(['DATE_REPORTED', 'date_reported', 'incident_datetime', 'DateReported']);
        const dateStr = dateVal ? new Date(dateVal).toLocaleDateString() : "Unknown Date";

        status = getProp(['YEAR', 'year', 'Year']) || "Reported";
        desc = getProp(['LOCATION', 'location', 'Location', 'location_description']) || "No location description.";

        details = {
            "Type": getProp(['HIGHEST_NIBRS_DESCRIPTION', 'highest_nibrs_description', 'offense_type_description', 'Description']) || "N/A",
            "Report ID": getProp(['INCIDENT_REPORT_ID', 'incident_report_id', 'IncidentReportId']) || "N/A",
            "Date": dateStr
        };

        // Debug
        const debugKeys = Object.keys(props).slice(0, 5).join(',');
        showDiagnostic(`Props: ${debugKeys}`);
        console.log("Crime Details:", details);
    } else if (type === 'plan2040') {
        title = props.PlaceTypeFullTxt || "2040 Policy Area";
        status = props.PlaceTypeCde || "Policy";
        desc = `This area is designated as ${title} under the Charlotte Future 2040 Plan.`;
        details = {
            "Planning Area": props.CommunityPlanningArea || "Unknown",
            "Adoption Date": props.AdoptionDate ? new Date(props.AdoptionDate).toLocaleDateString() : "N/A"
        };
    } else if (type === 'opportunity') {
        title = `Opportunity Zone`;
        status = `Tract ${props.GEOID10 || "N/A"}`;
        desc = "Opportunity Zones are economically-distressed communities where new investments, under certain conditions, may be eligible for preferential tax treatment.";
        details = {
            "Population": props.POPULATION ? props.POPULATION.toLocaleString() : "N/A",
            "Report": props.Tract_Type || "View official data"
        };
    } else if (type === 'schools') {
        title = props.Name || props.NAME || props.school_name || "School District";
        status = props.Ownership || "Public";
        desc = `School district boundary for ${title}.`;
        details = {
            "Type": props.Type || props.TYPE || "N/A",
            "Grade Level": props.GradeLevel || props.Grade_Level || props.LEVEL || "N/A",
            "Enrollment": props.Enrollment
        };
    } else if (type === 'zoning') {
        title = `Zoning: ${props.ZONING || "Unknown"}`;
        status = "Current";
        desc = props.DESCRIPTION || "Current zoning classification.";
        details = {
            "Ordinance": props.ORDINANCE || "UDO",
            "Context": props.CONTEXT || "N/A"
        };
    }

    // Render Logic
    const titleEl = document.getElementById('prop-petition');
    const statusEl = document.getElementById('prop-status');
    const notesEl = document.getElementById('prop-notes');
    const container = document.getElementById('details-container');

    if (titleEl) titleEl.textContent = title;

    // Status Badge
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = "inline-block px-2 py-1 text-xs font-semibold rounded mb-4 bg-gray-200 text-gray-800";
        if (status.toLowerCase().includes('approved') || status.toLowerCase().includes('complete')) {
            statusEl.classList.add('bg-green-100', 'text-green-800');
        } else if (status.toLowerCase().includes('denied') || status.toLowerCase().includes('withdraw')) {
            statusEl.classList.add('bg-red-100', 'text-red-800');
        }
    }

    if (notesEl) notesEl.textContent = desc;

    // Dynamic Loop
    if (container) {
        container.innerHTML = '';
        for (const [key, value] of Object.entries(details)) {
            // Render everything, even N/A, so we see it's trying
            if (value !== null && value !== undefined) {
                const div = document.createElement('div');
                div.className = 'pb-3 border-b border-gray-100 last:border-0';
                div.innerHTML = `
                    <div class="text-xs text-gray-500 font-medium mb-1">${key}</div>
                    <div class="text-sm text-gray-900">${value}</div>
                `;
                container.appendChild(div);
            }
        }

        // Add description
        if (desc && !desc.startsWith("No ")) {
            const descDiv = document.createElement('div');
            descDiv.className = 'pt-2';
            descDiv.innerHTML = `
                <div class="text-xs text-gray-500 font-medium mb-1">Description</div>
                <div class="text-sm text-gray-700 leading-relaxed">${desc}</div>
            `;
            container.appendChild(descDiv);
        }
    }

    // Auto-open sidebar on mobile
    // Auto-open sidebar on feature interaction
    showSidebar();
    showDiagnostic("Opening sidebar...");
}

/**
 * calculateInvestmentScore - V11 Logic
 * Analyzes proximity to all map layers to generate a potential score.
 */
function calculateInvestmentScore(latlng) {
    let score = 50; // Base baseline
    let factors = [];

    // 1. Proximity to Transit Stations (+25)
    if (rawData.stations) {
        let nearestStation = findNearest(latlng, rawData.stations, 0.5); // 0.5 miles approx 800m
        if (nearestStation) {
            score += 25;
            factors.push("Near Future/Current Transit station (+25)");
        }
    }

    // 2. Opportunity Zone Status (+20)
    if (rawData.opportunity) {
        if (isInside(latlng, rawData.opportunity)) {
            score += 20;
            factors.push("Located in Opportunity Zone (+20)");
        }
    }

    // 3. Rezoning Activity (+15 per nearby petition)
    if (rawData.rezoning) {
        let nearbyRezonings = findNearby(latlng, rawData.rezoning, 0.25);
        if (nearbyRezonings.length > 0) {
            const points = Math.min(30, nearbyRezonings.length * 10);
            score += points;
            factors.push(`${nearbyRezonings.length} Nearby Rezonings (+${points})`);
        }
    }

    // 4. 2040 Plan Density (+10)
    if (rawData.plan2040) {
        let policy = findIntersectingFeature(latlng, rawData.plan2040);
        if (policy && policy.properties.PlaceTypeFullTxt && policy.properties.PlaceTypeFullTxt.includes('Center')) {
            score += 15;
            factors.push("Planned High-Density Center (+15)");
        }
    }

    // 5. Schools (+10)
    if (rawData.schools) {
        let school = findIntersectingFeature(latlng, rawData.schools);
        if (school) {
            score += 10;
            factors.push("Located in established school district (+10)");
        }
    }

    // 6. Flood Zone Penalty (-30)
    if (rawData.flood) {
        if (isInside(latlng, rawData.flood)) {
            score -= 40;
            factors.push("Warning: Inside Flood Zone (-40)");
        }
    }

    // 7. Crime Heat Penalty (approximate)
    if (rawData.crime) {
        let nearbyCrimes = findNearby(latlng, rawData.crime, 0.1); // Within 1 block
        if (nearbyCrimes.length > 5) {
            score -= 15;
            factors.push("Higher frequency of reported incidents nearby (-15)");
        }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Update UI
    const scoreValEl = document.getElementById('score-value');
    const scoreLabelEl = document.getElementById('score-label');
    const scoreBarEl = document.getElementById('score-bar');
    const scoreSummaryEl = document.getElementById('score-summary');

    if (scoreValEl) scoreValEl.textContent = score;

    if (scoreLabelEl) {
        let label = "Fair";
        let colorClass = "bg-yellow-100 text-yellow-800";
        if (score >= 80) { label = "Excellent"; colorClass = "bg-green-100 text-green-800"; }
        else if (score >= 65) { label = "Good"; colorClass = "bg-blue-100 text-blue-800"; }
        else if (score < 40) { label = "Poor"; colorClass = "bg-red-100 text-red-800"; }

        scoreLabelEl.textContent = label;
        scoreLabelEl.className = `text-xs font-bold px-2 py-0.5 rounded-full uppercase ${colorClass}`;
    }

    if (scoreBarEl) {
        scoreBarEl.style.width = `${score}%`;
        // Color the bar
        if (score >= 80) scoreBarEl.className = "h-full bg-green-500 transition-all duration-1000";
        else if (score >= 65) scoreBarEl.className = "h-full bg-blue-600 transition-all duration-1000";
        else if (score < 40) scoreBarEl.className = "h-full bg-red-500 transition-all duration-1000";
        else scoreBarEl.className = "h-full bg-yellow-500 transition-all duration-1000";
    }

    if (scoreSummaryEl) {
        scoreSummaryEl.textContent = factors.length > 0 ? factors.join(". ") + "." : "Selected baseline location.";
    }
}

// Helper: Point in Polygon check (Simplified)
function isInside(latlng, geojson) {
    if (!geojson || !geojson.features) return false;
    // Leaflet's L.geoJSON has a method but here we need raw intersection or bounding box check
    // For simplicity in this env, we'll use a bounding box check first then some feature proximity
    return findIntersectingFeature(latlng, geojson) !== null;
}

function findIntersectingFeature(latlng, geojson) {
    const pt = [latlng.lng, latlng.lat];
    for (const feature of geojson.features) {
        if (!feature.geometry) continue;

        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            // Very simplified point-in-polygon
            if (isPointInPoly(pt, feature.geometry)) return feature;
        }
    }
    return null;
}

function findNearest(latlng, geojson, maxMiles) {
    if (!geojson || !geojson.features) return null;
    let nearest = null;
    let minDist = maxMiles;

    geojson.features.forEach(f => {
        if (f.geometry.type === 'Point') {
            const dist = map.distance(latlng, [f.geometry.coordinates[1], f.geometry.coordinates[0]]) / 1609.34; // meters to miles
            if (dist < minDist) {
                minDist = dist;
                nearest = f;
            }
        }
    });

    return nearest;
}

function findNearby(latlng, geojson, radiusMiles) {
    if (!geojson || !geojson.features) return [];
    return geojson.features.filter(f => {
        if (f.geometry.type === 'Point') {
            const dist = map.distance(latlng, [f.geometry.coordinates[1], f.geometry.coordinates[0]]) / 1609.34;
            return dist <= radiusMiles;
        } else {
            // For polygons, check if centroid is nearby or just if pt is inside (already done in isInside)
            return false;
        }
    });
}

function isPointInPoly(pt, geom) {
    if (geom.type === 'Polygon') {
        return pointInRing(pt, geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
        return geom.coordinates.some(ring => pointInRing(pt, ring[0]));
    }
    return false;
}

function pointInRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        let xi = ring[i][0], yi = ring[i][1];
        let xj = ring[j][0], yj = ring[j][1];
        let intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
            (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('-translate-x-full');
    }
}

function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('-translate-x-full');
    }
}

function setupUI() {
    // Sidebar Controls
    document.getElementById('close-sidebar').addEventListener('click', () => {
        hideSidebar();
    });
    document.getElementById('open-sidebar').addEventListener('click', () => {
        showSidebar();
    });

    // Reset View
    const resetBtn = document.getElementById('reset-view');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            map.setView(CHARLOTTE_COORDS, INITIAL_ZOOM);
        });
    }

    // Language Toggle
    let currentLang = 'en';
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'zh' : 'en';
            updateLanguage(currentLang);
        });
    }

    // Guide Modal
    const guideModal = document.getElementById('investment-guide-modal');
    const openGuideBtn = document.getElementById('open-guide');
    const closeGuideBtn = document.getElementById('close-guide');

    if (openGuideBtn && guideModal) {
        openGuideBtn.addEventListener('click', () => {
            guideModal.classList.remove('hidden');
        });
    }
    if (closeGuideBtn && guideModal) {
        closeGuideBtn.addEventListener('click', () => {
            guideModal.classList.add('hidden');
        });
    }

    // Geocoder Search
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: "Search Charlotte addresses...",
        collapsed: false
    })
        .on('markgeocode', function (e) {
            const center = e.geocode.center;
            map.setView(center, 16);

            // Show score for searched location (V11)
            const panel = document.getElementById('details-panel');
            const intro = document.getElementById('intro-text');
            panel.classList.remove('hidden');
            intro.classList.add('hidden');

            document.getElementById('prop-petition').textContent = "Searched Location";
            document.getElementById('prop-status').textContent = e.geocode.name || "Search Result";
            document.getElementById('prop-status').className = "inline-block px-2 py-1 text-xs font-semibold rounded mb-4 bg-indigo-50 text-indigo-700";
            document.getElementById('details-container').innerHTML = `<div class="text-sm text-gray-500 italic">${e.geocode.name}</div>`;

            calculateInvestmentScore(center);
            showSidebar();
        })
        .addTo(map);

    // Move geocoder to custom container
    const geocoderEl = geocoder.getContainer();
    const geocoderContainer = document.getElementById('geocoder-container');
    if (geocoderContainer && geocoderEl) {
        geocoderContainer.appendChild(geocoderEl);
    }

    // Layer Toggles
    setupLayerToggle('layer-rezoning', 'rezoning');
    setupLayerToggle('layer-transit', 'transit');
    setupLayerToggle('layer-cip', 'cip');
    setupLayerToggle('layer-crime', 'crime');

    // New Toggles
    setupLayerToggle('layer-schools', 'schools');
    setupLayerToggle('layer-transit-stations', 'stations');
    setupLayerToggle('layer-opportunity-zones', 'opportunity');
    setupLayerToggle('layer-2040-plan', 'plan2040');
    setupLayerToggle('layer-flood-zones', 'flood');
    setupLayerToggle('layer-current-zoning', 'zoning');

    // Add version label
    const h1 = document.querySelector('#sidebar h1');
    if (h1) {
        const v = document.createElement('span');
        v.className = 'text-xs text-gray-400 font-normal ml-2';
        v.textContent = 'v11';
        h1.appendChild(v);
    }
}

/**
 * updateLanguage - Updates all elements with data-i18n attribute
 */
function updateLanguage(lang) {
    if (typeof TRANSLATIONS === 'undefined') return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            el.innerHTML = TRANSLATIONS[lang][key];
        }
    });

    // Update toggle button text/icon
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.textContent = lang === 'en' ? '🇺🇸' : '🇨🇳';
    }
}

function setupLayerToggle(id, layerKey) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('change', (e) => {
        showDiagnostic(`Toggle: ${layerKey} (${e.target.checked})`);
        if (e.target.checked) {
            if (layers[layerKey]) {
                layers[layerKey].addTo(map);
                showDiagnostic(`Added: ${layerKey}`);
            } else {
                showDiagnostic(`Err: Data for ${layerKey} is missing!`);
                console.error(`Layer ${layerKey} is null`);
            }
        } else {
            if (layers[layerKey]) map.removeLayer(layers[layerKey]);
        }
    });
}
