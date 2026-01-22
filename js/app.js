// Charlotte Coordinates
const CHARLOTTE_COORDS = [35.2271, -80.8431];
const INITIAL_ZOOM = 12;

// 0. Safety Wrapper & Diagnostics
function showDiagnostic(msg) {
    const statusEl = document.getElementById('js-status') || (() => {
        const intro = document.getElementById('intro-text');
        if (!intro) return null;
        const el = document.createElement('div');
        el.id = 'js-status';
        el.className = 'mt-2 p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100 font-mono';
        intro.appendChild(el);
        return el;
    })();
    if (statusEl) statusEl.textContent = "Status: " + msg;
    console.log("DIAGNOSTIC:", msg);
}

window.onerror = function (msg, url, line, col, error) {
    showDiagnostic("Err: " + msg + " (L" + line + ")");
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    showDiagnostic("Initializing...");
    try {
        initMap();
        showDiagnostic("Map OK");
    } catch (e) {
        showDiagnostic("Map Err: " + e.message);
    }

    try {
        setupUI();
        showDiagnostic("Ready (v6)");
    } catch (e) {
        showDiagnostic("UI Err: " + e.message);
    }
});

let map;
let layers = {
    rezoning: null,
    transit: null,
    cip: null,
    crime: null,
    schools: null,
    transitStations: null,
    opportunityZones: null,
    buildingPermits: null,
    charlotte2040: null,
    floodZones: null,
    currentZoning: null,
    walkability: null
};

// Bilingual State
let currentLang = 'en';
try {
    currentLang = localStorage.getItem('app_lang') || 'en';
} catch (e) {
    console.warn('localStorage access failed:', e);
}

window.toggleLanguage = function () {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    try {
        localStorage.setItem('app_lang', currentLang);
    } catch (e) { }
    updateLanguageUI();
}

function updateLanguageUI() {
    // 1. Update Switcher Icon
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = currentLang === 'en' ? '🇺🇸' : '🇨🇳';

    // 2. Update Static Text
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
            // Handle input placeholders specially if needed, but for now mostly textContent
            el.innerHTML = TRANSLATIONS[currentLang][key];
        }
    });

    // 3. Update Dynamic Elements (Score Labels)
    // Rerun calculations if a property is selected to update score text
    const scoreLabel = document.getElementById('score-label');
    if (scoreLabel && scoreLabel.textContent) {
        // Simple re-trigger via existing selected coordinates if available wouldn't be easy without storage
        // So we might just clear or let it update on next click.
        // Or mapped manually:
        if (currentLang === 'zh') {
            if (scoreLabel.textContent === "Strong Buy") scoreLabel.textContent = "强烈推荐";
            if (scoreLabel.textContent === "Good Opportunity") scoreLabel.textContent = "良机";
            if (scoreLabel.textContent === "Neutral") scoreLabel.textContent = "中立";
            if (scoreLabel.textContent === "High Risk") scoreLabel.textContent = "高风险";
        }
    }
}

function initMap() {
    // 1. Initialize Map
    // 1. Initialize Map with tap disabled for better mobile response
    map = L.map('map', { tap: false }).setView(CHARLOTTE_COORDS, INITIAL_ZOOM);

    // 2. Add Base Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 3. Reposition zoom controls to bottom-left, away from menu
    map.zoomControl.setPosition('bottomleft');

    // 3. Load Initial Data
    loadLayer('planning/rezonings', 'rezoning', renderRezoningLayer);
    loadLayer('infrastructure/transit_projects', 'transit', renderTransitLayer, false); // Default off
    loadLayer('infrastructure/cip_projects', 'cip', renderCIPLayer, false); // Default off
    loadLayer('risk/cmpd_incidents', 'crime', renderCrimeHeatmap, false); // Default off

    // 4. Load New Investment Layers
    loadLayer('development/school_districts', 'schools', renderSchoolLayer, false);
    loadLayer('infrastructure/transit_stations', 'transitStations', renderTransitStationsLayer, false);
    loadLayer('planning/opportunity_zones', 'opportunityZones', renderOpportunityZonesLayer, false);
    loadLayer('development/building_permits', 'buildingPermits', renderBuildingPermitsLayer, false);
    loadLayer('planning/charlotte_2040_plan', 'charlotte2040', renderCharlotte2040Layer, false);
    loadLayer('risk/flood_zones', 'floodZones', renderFloodZonesLayer, false);
    loadLayer('planning/current_zoning', 'currentZoning', renderCurrentZoningLayer, false);
    loadLayer('lifestyle/walkability', 'walkability', renderWalkabilityLayer, false);
}

async function loadLayer(fileName, layerKey, renderFunction, addToMap = true) {
    try {
        const response = await fetch(`data/${fileName}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Store raw data for score calculations
        if (!window.geoData) window.geoData = {};
        window.geoData[layerKey] = data;

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
        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    });

    // 2. Create visible clickable markers for interaction (Red Dots)
    const markersLayer = L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 4,
                fillColor: '#ef4444', // Red
                color: '#991b1b', // Dark Red border
                weight: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'crime')
    });

    // Add both layers to the group
    crimeLayerGroup.addLayer(heatmapLayer);
    crimeLayerGroup.addLayer(markersLayer);

    return crimeLayerGroup;
}

function renderSchoolLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => {
            const rating = feature.properties.rating || 5;
            // Color code by rating: 9-10 = dark purple, 7-8 = medium purple, <7 = light purple
            let fillColor;
            if (rating >= 9) {
                fillColor = '#7c3aed'; // Dark purple - top rated
            } else if (rating >= 7) {
                fillColor = '#a78bfa'; // Medium purple
            } else {
                fillColor = '#ddd6fe'; // Light purple - lower rated
            }

            return {
                fillColor: fillColor,
                weight: 2,
                opacity: 1,
                color: '#5b21b6',
                dashArray: '5,5',
                fillOpacity: 0.4
            };
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'schools')
    });
}

function renderTransitStationsLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
            const isProposed = feature.properties.status === 'Proposed';
            const icon = L.divIcon({
                className: 'custom-transit-marker',
                html: `<div class="${isProposed ? 'bg-indigo-300' : 'bg-indigo-600'} w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <span class="text-white text-xs font-bold">🚇</span>
                       </div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker(latlng, { icon });

            // Add 0.5 mile buffer circle (TOD zone)
            const circle = L.circle(latlng, {
                radius: 804.67, // 0.5 miles in meters
                fillColor: '#818cf8',
                color: '#4f46e5',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.2,
                dashArray: '5,5'
            });

            const layerGroup = L.layerGroup([circle, marker]);

            // Attach click handler to marker
            marker.on('click', (e) => {
                zoomToFeature(e);
                updateSidebar(feature.properties, 'transitStations', e.latlng);
            });

            return layerGroup;
        }
    });
}

function renderOpportunityZonesLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: '#f97316', // Orange
            weight: 3,
            opacity: 0.8,
            color: '#ea580c',
            dashArray: '10,5',
            fillOpacity: 0.2
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'opportunityZones')
    });
}

function renderBuildingPermitsLayer(geoJsonData) {
    // Create a layer group to hold both heatmap and clickable markers
    const permitsLayerGroup = L.layerGroup();

    // 1. Create heatmap for visualization
    const points = geoJsonData.features.map(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        // Weight by valuation (higher value = more intensity)
        const valuation = feature.properties.valuation || 100000;
        const intensity = Math.min(valuation / 1000000, 3); // Cap at 3x intensity
        return [lat, lng, intensity];
    });

    const heatmapLayer = L.heatLayer(points, {
        radius: 30,
        blur: 20,
        maxZoom: 15,
        gradient: { 0.2: 'lightblue', 0.5: 'cyan', 0.7: 'lime', 1: 'teal' }
    });

    // 2. Create invisible clickable markers for interaction
    const markersLayer = L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: 'transparent',
                color: 'transparent',
                weight: 0,
                fillOpacity: 0
            });
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'buildingPermits')
    });

    // Add both layers to the group
    permitsLayerGroup.addLayer(heatmapLayer);
    permitsLayerGroup.addLayer(markersLayer);

    return permitsLayerGroup;
}

function renderCharlotte2040Layer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => {
            const placeType = feature.properties.place_type;
            let fillColor, opacity;

            // Color code by place type
            if (placeType.includes('Urban Place')) {
                fillColor = '#ec4899'; // Pink - highest density
                opacity = 0.4;
            } else if (placeType.includes('Mixed-Use Activity Center')) {
                fillColor = '#f97316'; // Orange - high density
                opacity = 0.35;
            } else if (placeType.includes('Transit Corridor')) {
                fillColor = '#8b5cf6'; // Purple - transit focus
                opacity = 0.3;
            } else if (placeType.includes('Neighborhood Center')) {
                fillColor = '#10b981'; // Green - medium density
                opacity = 0.25;
            } else {
                fillColor = '#6b7280'; // Gray - suburban
                opacity = 0.2;
            }

            return {
                fillColor: fillColor,
                weight: 2,
                opacity: 0.8,
                color: fillColor,
                dashArray: '8,4',
                fillOpacity: opacity
            };
        },
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'charlotte2040')
    });
}

function renderFloodZonesLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: '#22d3ee', // Cyan
            weight: 2,
            opacity: 0.8,
            color: '#0891b2',
            fillOpacity: 0.5
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'floodZones')
    });
}

function renderCurrentZoningLayer(geoJsonData) {
    return L.geoJSON(geoJsonData, {
        style: feature => ({
            fillColor: '#4b5563', // Gray
            weight: 1,
            opacity: 0.8,
            color: '#1f2937',
            fillOpacity: 0.3
        }),
        onEachFeature: (feature, layer) => onEachFeature(feature, layer, 'currentZoning')
    });
}

function renderWalkabilityLayer(geoJsonData) {
    // Create a heatmap for walkability
    const points = geoJsonData.features.map(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        return [lat, lng, 0.8];
    });

    const heatmapLayer = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 15,
        gradient: { 0.4: '#ecfccb', 0.7: '#a3e635', 1: '#4d7c0f' } // Lime gradient
    });

    return heatmapLayer;
}

function onEachFeature(feature, layer, type) {
    // Handle both click and tap events for iOS compatibility
    const handleInteraction = (e) => {
        console.log(`Feature clicked: ${type}`, feature.properties);
        zoomToFeature(e);
        updateSidebar(feature.properties, type, e.latlng);
    };

    layer.on({
        mouseover: highlightFeature,
        mouseout: (e) => resetHighlight(e, type),
        click: handleInteraction
    });
}

// --- Investment Score Logic ---

function calculateInvestmentScore(latlng) {
    let score = 50; // Base score
    let factors = [];
    const lat = latlng.lat;
    const lng = latlng.lng;

    // 1. Proximity to Transit Stations (+15 per station within 0.5 mi)
    if (window.geoData && window.geoData.transitStations) {
        let transitBonus = 0;
        window.geoData.transitStations.features.forEach(f => {
            const [fLng, fLat] = f.geometry.coordinates;
            const dist = getDistance([lat, lng], [fLat, fLng]);
            if (dist <= 0.5) {
                transitBonus += 15;
            }
        });
        if (transitBonus > 0) {
            score += Math.min(transitBonus, 30);
            factors.push("🚇 Near Transit Station");
        }
    }

    // 2. Opportunity Zone (+10)
    if (window.geoData && window.geoData.opportunityZones) {
        let inOZ = false;
        window.geoData.opportunityZones.features.forEach(f => {
            if (isPointInPolygon([lng, lat], f.geometry.coordinates[0])) {
                inOZ = true;
            }
        });
        if (inOZ) {
            score += 10;
            factors.push("💰 Opportunity Zone Status");
        }
    }

    // 3. School Rating (+10 for rating > 7)
    if (window.geoData && window.geoData.schools) {
        window.geoData.schools.features.forEach(f => {
            if (isPointInPolygon([lng, lat], f.geometry.coordinates[0])) {
                const rating = f.properties.rating || 5;
                if (rating >= 8) {
                    score += 15;
                    factors.push("🏫 Top-Rated School District");
                } else if (rating >= 7) {
                    score += 5;
                    factors.push("✅ Good School District");
                }
            }
        });
    }

    // 4. Flood Risk (-25 for High Risk)
    if (window.geoData && window.geoData.floodZones) {
        let inFlood = false;
        window.geoData.floodZones.features.forEach(f => {
            if (isPointInPolygon([lng, lat], f.geometry.coordinates[0])) {
                inFlood = true;
            }
        });
        if (inFlood) {
            score -= 25;
            factors.push("⚠️ High Flood Risk (AE Zone)");
        }
    }

    // 5. 2040 Plan Growth Area (+10)
    if (window.geoData && window.geoData.charlotte2040) {
        window.geoData.charlotte2040.features.forEach(f => {
            if (isPointInPolygon([lng, lat], f.geometry.coordinates[0])) {
                if (f.properties.density === 'High' || f.properties.density === 'Very High') {
                    score += 10;
                    factors.push("🚀 2040 High-Density Zone");
                }
            }
        });
    }

    // 6. Building Permit Momentum (+5 per $1M in last 0.25 miles, cap +25)
    if (window.geoData && window.geoData.buildingPermits) {
        let permitValuationTotal = 0;
        let permitCount = 0;
        window.geoData.buildingPermits.features.forEach(f => {
            const [fLng, fLat] = f.geometry.coordinates;
            const dist = getDistance([lat, lng], [fLat, fLng]);
            if (dist <= 0.25) {
                permitValuationTotal += (f.properties.valuation || 0);
                permitCount++;
            }
        });

        if (permitCount > 0) {
            const valuationBonus = Math.min(Math.floor(permitValuationTotal / 1000000) * 5, 25);
            if (valuationBonus > 0) {
                score += valuationBonus;
                factors.push(`🏗️ $${(permitValuationTotal / 1000000).toFixed(1)}M Development Momentum`);
            } else if (permitCount >= 3) {
                score += 10;
                factors.push("🛠️ Active Infill Cluster");
            }
        }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
        value: score,
        factors: factors
    };
}

// Helper: Point in Polygon (Ray Casting)
function isPointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Helper: Distance in Miles
function getDistance(p1, p2) {
    const R = 3958.8; // Radius of Earth in miles
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
    } else if (type === 'floodZones') {
        layers.floodZones.resetStyle(layer);
    }
}

function zoomToFeature(e) {
    const layer = e.target;
    // Check if layer has bounds (polygons) or is a point
    if (layer.getBounds) {
        map.fitBounds(layer.getBounds());
    } else if (layer.getLatLng) {
        // For point features, zoom to the point
        map.setView(layer.getLatLng(), 16);
    }
}

// --- Sidebar Content ---

function updateSidebar(props, type, latlng) {
    const panel = document.getElementById('details-panel');
    const intro = document.getElementById('intro-text');
    const scrollContainer = document.getElementById('sidebar-content');

    panel.classList.remove('hidden');
    intro.classList.add('hidden');

    // Auto-scroll to top of sidebar when new content is loaded
    if (scrollContainer) {
        scrollContainer.scrollTop = 0;
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
            "Existing Zoning": props.ExistingZoning || props.EXISTING_ZONING || props.ExistZone || "N/A",
            "Proposed Zoning": props.ProposedZoning || props.PROPOSED_ZONING || props.ReqZone || "N/A"
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
        title = props.ProjectName || props.Project_Name || "Capital Project";
        status = props.Status || props.Project_Phase || "In Progress";
        desc = props.ProjectDesc || props.Location_Description || "No description.";
        details = {
            "Department": props.Department || "Planning",
            "Cost": props.TotalBudget || props.Total_Project_Budget || "N/A"
        };
    } else if (type === 'crime') {
        title = `Incident ${props.INCIDENT_REPORT_ID || "N/A"}`;
        status = props.HIGHEST_NIBRS_DESCRIPTION || "Unknown";
        desc = `Location: ${props.LOCATION || "Unknown location"}`;

        // Format date if available
        let dateReported = "N/A";
        if (props.DATE_REPORTED) {
            const date = new Date(props.DATE_REPORTED);
            dateReported = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }

        details = {
            "Date Reported": dateReported,
            "Crime Type": props.HIGHEST_NIBRS_DESCRIPTION,
            "Location": props.LOCATION
        };
    } else if (type === 'schools') {
        title = props.school_name || "School District";
        const rating = props.rating || 0;
        status = `Rating: ${rating}/10`;
        desc = props.description || "School district information";
        details = {
            "School Type": props.school_type,
            "Enrollment": props.enrollment ? props.enrollment.toLocaleString() : "N/A",
            "Rating": `${rating}/10`,
            "Investment Note": rating >= 9 ? "🎯 Premium district - attracts affluent families" : rating >= 7 ? "✅ Good district - stable investment" : "⚠️ Opportunity zone - buy before improvement"
        };
    } else if (type === 'search') {
        title = props.name || "Searched Location";
        status = "External Address";
        desc = "This location was found via address search. See the Investment Score above for automated analysis.";
        details = {}; // No specific details for a generic search result
    } else if (type === 'transitStations') {
        title = props.name || "Transit Station";
        status = `${props.line} (${props.status})`;
        desc = props.status === 'Proposed' ? 'Future station - buy before construction' : 'Active station - TOD zoning eligible';
        details = {
            "Line": props.line,
            "Status": props.status,
            "Opened": props.opened || "TBD",
            "TOD Eligible": props.tod_eligible ? "✅ Yes - Properties within 0.5 mi can request higher density" : "No"
        };
    } else if (type === 'opportunityZones') {
        title = props.name || "Opportunity Zone";
        status = `Zone ${props.zone_id}`;
        desc = props.description || "Federal Qualified Opportunity Zone";
        details = {
            "Zone ID": props.zone_id,
            "Designated": props.designation_year,
            "Tax Benefits": props.tax_benefits,
            "Investment Advantage": "🎯 Capital gains deferral + potential elimination"
        };
    } else if (type === 'buildingPermits') {
        const permitType = props.permit_type || "Construction";
        title = `${permitType} Permit`;
        const valuation = props.valuation || 0;
        status = `$${valuation.toLocaleString()}`;
        desc = props.description || props.project_name || "Building permit activity";
        details = {
            "Permit Type": permitType,
            "Valuation": `$${valuation.toLocaleString()}`,
            "Issue Date": props.issue_date || "Recent",
            "Investment Signal": permitType.includes('Multi-family') ? "🎯 High density = development momentum" : permitType.includes('Commercial') ? "✅ Commercial activity = neighborhood services" : "🚧 Renovation = value add"
        };
    } else if (type === 'charlotte2040') {
        title = props.place_type || "2040 Plan Area";
        status = `Density: ${props.density}`;
        desc = props.description || "Charlotte 2040 Comprehensive Plan designation";
        details = {
            "Place Type": props.place_type,
            "Target Density": props.density,
            "Future Transit": props.future_transit ? "✅ Yes - Transit corridor" : "No",
            "Investment Note": props.investment_note || "Future development area"
        };
    } else if (type === 'floodZones') {
        title = props.name || "Flood Zone";
        status = props.zone || "Flood Risk Area";
        desc = props.description || "Mecklenburg County Floodplain (FINS)";
        details = {
            "Creek Name": props.creek_name,
            "Risk Level": props.risk_level,
            "Zone": props.zone,
            "Insurance Impact": props.insurance_impact,
            "Investment Note": props.investment_note
        };
    } else if (type === 'currentZoning') {
        title = props.ZoneDes || props.ZoneClass || "Current Zoning";
        status = props.ZoneClass || "District";
        desc = `Zoning district: ${props.ZoneDes}`;
        details = {
            "Class": props.ZoneClass,
            "Designation": props.ZoneDes,
            "Rezone Date": props.RezoneDate ? new Date(props.RezoneDate).toLocaleDateString() : "N/A",
            "Consistent": props.Consistent || "N/A"
        };
    } else if (type === 'walkability') {
        title = "Walkability Indicator";
        status = "Active Heatmap";
        desc = "This area shows concentration of walkable amenities.";
        details = {
            "Type": "Heatmap Point",
            "Impact": "High walkability correlates with 10-15% rent premium"
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

    // Dynamic Builder for Details - Mobile optimized
    const container = document.getElementById('details-container');
    container.innerHTML = ''; // Clear previous

    console.log('Rendering details for type:', type, 'Details object:', details);

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

    // Add description at the end (skip for crime since location is already in details)
    if (desc && desc !== "No description." && type !== 'crime') {
        const descDiv = document.createElement('div');
        descDiv.className = 'pt-2';
        descDiv.innerHTML = `
            <div class="text-xs text-gray-500 font-medium mb-1">Description</div>
            <div class="text-sm text-gray-700 leading-relaxed">${desc}</div>
        `;
        container.appendChild(descDiv);
    }

    // Always open sidebar when clicking a feature
    document.getElementById('sidebar').classList.remove('-translate-x-full');

    // Update Investment Score if coordinates are available
    if (latlng) {
        const scoreObj = calculateInvestmentScore(latlng);
        const scoreVal = document.getElementById('score-value');
        const scoreBar = document.getElementById('score-bar');
        const scoreLabel = document.getElementById('score-label');
        const scoreSummary = document.getElementById('score-summary');

        scoreVal.textContent = scoreObj.value;
        scoreBar.style.width = `${scoreObj.value}%`;

        // Update color and label based on score
        if (scoreObj.value >= 80) {
            scoreLabel.textContent = "Strong Buy";
            scoreLabel.className = "text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-800";
            scoreBar.className = "h-full bg-green-600 transition-all duration-1000";
        } else if (scoreObj.value >= 60) {
            scoreLabel.textContent = "Good Opportunity";
            scoreLabel.className = "text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-blue-100 text-blue-800";
            scoreBar.className = "h-full bg-blue-600 transition-all duration-1000";
        } else if (scoreObj.value >= 40) {
            scoreLabel.textContent = "Neutral";
            scoreLabel.className = "text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-yellow-100 text-yellow-800";
            scoreBar.className = "h-full bg-yellow-600 transition-all duration-1000";
        } else {
            scoreLabel.textContent = "High Risk";
            scoreLabel.className = "text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-red-100 text-red-800";
            scoreBar.className = "h-full bg-red-600 transition-all duration-1000";
        }

        // Summary of factors
        if (scoreObj.factors.length > 0) {
            scoreSummary.innerHTML = `<strong>Factors:</strong> ${scoreObj.factors.join(", ")}`;
        } else {
            scoreSummary.textContent = "Standard investment profile. No significant positive or negative growth triggers detected at this location.";
        }
    }
}

// Sidebar Controls
window.toggleSidebar = function () {
    console.log("Toggling sidebar...");
    const sidebar = document.getElementById('sidebar');
    const isClosed = sidebar.classList.contains('-translate-x-full');
    if (isClosed) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
}


// Guide Controls
window.toggleGuide = function () {
    console.log("Toggling guide...");
    const modal = document.getElementById('investment-guide-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function setupUI() {
    console.log("Setting up UI components...");

    // 1. Sidebar Toggle Fix
    try {
        const openSidebarBtn = document.getElementById('open-sidebar');
        const closeSidebarBtn = document.getElementById('close-sidebar');
        if (openSidebarBtn) openSidebarBtn.addEventListener('click', (e) => { e.stopPropagation(); window.toggleSidebar(); });
        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', (e) => { e.stopPropagation(); window.toggleSidebar(); });
        console.log("Sidebar listeners attached");
    } catch (e) { console.error("Sidebar setup error:", e); }

    // 2. Language Switcher
    try {
        const langToggleBtn = document.getElementById('lang-toggle');
        if (langToggleBtn) langToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); window.toggleLanguage(); });
    } catch (e) { }

    // 3. Investment Guide
    try {
        const modal = document.getElementById('investment-guide-modal');
        const openGuideBtn = document.getElementById('open-guide');
        const closeGuideBtn = document.getElementById('close-guide');
        if (openGuideBtn) openGuideBtn.addEventListener('click', (e) => { e.stopPropagation(); window.toggleGuide(); });
        if (closeGuideBtn) closeGuideBtn.addEventListener('click', (e) => { e.stopPropagation(); window.toggleGuide(); });
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    } catch (e) { }

    // 4. Info Icons (The "i" buttons)
    try {
        const infoIcons = document.querySelectorAll('.info-icon');
        console.log(`Found ${infoIcons.length} info icons`);
        infoIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = icon.getAttribute('title');
                console.log("Info click:", text);
                if (text) alert(text);
                return false;
            });
            // Also add touchstart for better mobile response
            icon.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            }, { passive: true });
        });
    } catch (e) { console.error("Info icon setup error:", e); }

    // 5. Layer Toggles
    try {
        const layerIds = [
            ['layer-rezoning', 'rezoning'], ['layer-transit', 'transit'], ['layer-cip', 'cip'],
            ['layer-crime', 'crime'], ['layer-schools', 'schools'], ['layer-transit-stations', 'transitStations'],
            ['layer-opportunity-zones', 'opportunityZones'], ['layer-building-permits', 'buildingPermits'],
            ['layer-2040-plan', 'charlotte2040'], ['layer-flood-zones', 'floodZones'],
            ['layer-current-zoning', 'currentZoning'], ['layer-walkability', 'walkability']
        ];
        layerIds.forEach(([id, key]) => setupLayerToggle(id, key));
        console.log("Layer toggle listeners attached");
    } catch (e) { console.error("Layer toggle setup error:", e); }

    // 6. Components
    try { setupCalculator(); } catch (e) { console.error("Calculator setup error:", e); }
    try { initSearch(); } catch (e) { console.error("Search setup error:", e); }
    try { setupResetView(); } catch (e) { console.error("Reset setup error:", e); }
    try { setupPresets(); } catch (e) { console.error("Presets setup error:", e); }

    // 7. Initial State
    try { updateLanguageUI(); } catch (e) { }
}

function initSearch() {
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: "Search Charlotte addresses...",
        collapsed: false,
        container: 'geocoder-container'
    })
        .on('markgeocode', function (e) {
            const latlng = e.geocode.center;
            map.setView(latlng, 16);
            updateSidebar({ name: e.geocode.name }, 'search', latlng);
        })
        .addTo(map);

    // Style the geocoder container a bit more
    const container = document.getElementById('geocoder-container');
    const geocoderInput = container.querySelector('input');
    if (geocoderInput) {
        geocoderInput.className = "w-full px-4 py-2 text-sm border-none rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500 overflow-hidden bg-white";
    }
}

function setupResetView() {
    const btn = document.getElementById('reset-view');
    if (btn) {
        btn.onclick = () => {
            map.setView([35.2271, -80.8431], 12);
        };
    }
}

function setupCalculator() {
    const priceInput = document.getElementById('calc-price');
    const rentInput = document.getElementById('calc-rent');

    if (priceInput && rentInput) {
        priceInput.addEventListener('input', updateCalculations);
        rentInput.addEventListener('input', updateCalculations);

        // Settings listeners
        const settingsToggle = document.getElementById('open-calc-settings');
        const settingsPanel = document.getElementById('calc-settings');
        const downpaymentInput = document.getElementById('setting-downpayment');
        const interestInput = document.getElementById('setting-interest');
        const fixedExpInput = document.getElementById('setting-fixed-exp');

        // Load saved settings
        if (localStorage.getItem('calc-downpayment')) downpaymentInput.value = localStorage.getItem('calc-downpayment');
        if (localStorage.getItem('calc-interest')) interestInput.value = localStorage.getItem('calc-interest');
        if (localStorage.getItem('calc-fixed-exp')) fixedExpInput.value = localStorage.getItem('calc-fixed-exp');

        settingsToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });

        [downpaymentInput, interestInput, fixedExpInput].forEach(el => {
            el.addEventListener('input', () => {
                // Save settings
                localStorage.setItem('calc-downpayment', downpaymentInput.value);
                localStorage.setItem('calc-interest', interestInput.value);
                localStorage.setItem('calc-fixed-exp', fixedExpInput.value);
                updateCalculations();
            });
        });

        updateCalculations();
    }
}

function updateCalculations() {
    const price = parseFloat(document.getElementById('calc-price').value) || 0;
    const rent = parseFloat(document.getElementById('calc-rent').value) || 0;

    const onePercentStatus = document.getElementById('calc-1percent-status');
    const cocValue = document.getElementById('calc-coc');

    if (price <= 0) return;

    // 1% Rule
    const ratio = (rent / price) * 100;
    if (ratio >= 1.0) {
        onePercentStatus.textContent = "Pass (Strong)";
        onePercentStatus.className = "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-green-100 text-green-800";
    } else if (ratio >= 0.7) {
        onePercentStatus.textContent = "Pass (Average)";
        onePercentStatus.className = "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-800";
    } else {
        onePercentStatus.textContent = "Fail (Soft)";
        onePercentStatus.className = "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-yellow-100 text-yellow-800";
    }

    // Cash-on-Cash Estimation (Simplified for Charlotte)
    // Dynamic Assumptions from settings
    const downPercent = (parseFloat(document.getElementById('setting-downpayment').value) || 25) / 100;
    const interestRate = (parseFloat(document.getElementById('setting-interest').value) || 6.5) / 100;
    const fixedExpenses = parseFloat(document.getElementById('setting-fixed-exp').value) || 450;

    const downPayment = price * downPercent;
    const loanAmount = price * (1 - downPercent);
    const monthlyInterest = (interestRate / 12);

    let mortgage = 0;
    if (monthlyInterest > 0) {
        mortgage = loanAmount * (monthlyInterest * Math.pow(1 + monthlyInterest, 360)) / (Math.pow(1 + monthlyInterest, 360) - 1);
    } else {
        mortgage = loanAmount / 360;
    }

    const operationalExpenses = (rent * 0.10) + fixedExpenses; // 10% buffer + dynamic fixed
    const monthlyCashFlow = rent - mortgage - operationalExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    const coc = (annualCashFlow / downPayment) * 100;
    cocValue.textContent = `${coc.toFixed(1)}%`;
    cocValue.className = coc >= 8 ? "text-sm font-black text-green-600" : (coc >= 4 ? "text-sm font-black text-blue-600" : "text-sm font-black text-gray-900");
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

function applyPreset(presetType) {
    console.log("Applying preset:", presetType);
    const presets = {
        'growth': ['layer-rezoning', 'layer-2040-plan', 'layer-building-permits'],
        'transit': ['layer-transit', 'layer-transit-stations'],
        'lifestyle': ['layer-walkability', 'layer-transit-stations'],
        'conservative': ['layer-schools'],
        'reset': []
    };

    const targetLayers = presets[presetType] || [];

    // Clear all checkboxes - use a broader selector and ensure event dispatch
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) {
            cb.checked = false;
            // Force change event to trigger layer removals
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // Apply new preset layers with a slight delay to ensure cleanup finished
    setTimeout(() => {
        targetLayers.forEach(id => {
            const cb = document.getElementById(id);
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                console.log("Activated layer:", id);
            } else {
                console.warn("Preset layer ID not found:", id);
            }
        });
    }, 50);
}

function setupPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        const handle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = btn.dataset.preset;
            console.log("Preset clicked:", type);
            applyPreset(type);

            document.querySelectorAll('.preset-btn').forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-white', 'text-gray-700');
            });
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('bg-white', 'text-gray-700');
        };

        btn.addEventListener('click', handle);
        btn.addEventListener('touchstart', handle, { passive: false });
    });
}
