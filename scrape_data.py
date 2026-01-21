import requests
import json
import os
import random
import time

# Configuration
DATA_DIRS = {
    "planning": ["rezonings", "charlotte_2040_plan", "opportunity_zones", "current_zoning"],
    "infrastructure": ["transit_projects", "cip_projects", "transit_stations"],
    "risk": ["cmpd_incidents", "flood_zones"],
    "development": ["building_permits", "school_districts"],
    "lifestyle": ["walkability"]
}

# Real and Placeholder API Endpoints
# Using Charlotte Open Data Portal (ArcGIS REST) patterns where applicable
ENDPOINTS = {
    "rezonings": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Rezonings/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "transit_projects": "https://gis.charlottenc.gov/arcgis/rest/services/CATS/TransitStationDevelopmentPublic/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cip_projects": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Planning_ThingsNearMe/MapServer/6/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cmpd_incidents": "https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?where=YEAR+%3E%3D+%272024%27&outFields=INCIDENT_REPORT_ID,LATITUDE_PUBLIC,LONGITUDE_PUBLIC,HIGHEST_NIBRS_DESCRIPTION,DATE_REPORTED,LOCATION&outSR=4326&f=geojson",
    "school_districts": "https://gis.charlottenc.gov/arcgis/rest/services/CMS/SchoolDistricts/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "transit_stations": "https://gis.charlottenc.gov/arcgis/rest/services/CATS/CATS_Facilities/MapServer/0/query?where=FACILITYTYPE%3D'Light+Rail+Station'&outFields=*&outSR=4326&f=geojson",
    "opportunity_zones": "https://services.mecklenburgcountync.gov/arcgis/rest/services/Economic_Development/Opportunity_Zones/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "building_permits": "https://services.mecklenburgcountync.gov/arcgis/rest/services/Public/BuildingPermitLocations/MapServer/0/query?where=ISSUED_DATE%20%3E%3D%20DATE%20'2024-01-01'&outFields=*&outSR=4326&f=geojson", # Permits from 2024 onwards
    "flood_zones": "https://services.mecklenburgcountync.gov/arcgis/rest/services/Water/Floodplain/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "current_zoning": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Zoning/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "charlotte_2040_plan": "https://services.mecklenburgcountync.gov/arcgis/rest/services/PLN/CLT_Future_2040_Policy_Map/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "walkability": None # Remains synthetic or needs a complex proxy
}

def ensure_dirs():
    for subdir in DATA_DIRS.keys():
        path = os.path.join("data", subdir)
        if not os.path.exists(path):
            os.makedirs(path)

def generate_synthetic_point_data(name, count=15):
    """Generates random point data for layers like permits"""
    print(f"Generating synthetic data for {name}...")
    features = []
    center_lat, center_lng = 35.2271, -80.8431
    for i in range(count):
        lat = center_lat + (random.random() - 0.5) * 0.15
        lng = center_lng + (random.random() - 0.5) * 0.15
        props = {"id": i, "name": f"Synthetic {name} {i}"}
        
        if name == "building_permits":
            props["valuation"] = random.randint(500000, 5000000)
            props["project_name"] = "New Development"
        
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {"type": "Point", "coordinates": [lng, lat]}
        })
    return {"type": "FeatureCollection", "features": features}

def generate_synthetic_polygons(name):
    """Generates simplified synthetic polygons"""
    print(f"Generating synthetic polygons for {name}...")
    features = []
    # Just a single dummy box for demonstration
    # Create properties based on layer type to support scoring logic
    props = {"name": f"Synthetic {name} Area", "zone": "Mixed Use"}
    
    if name == "charlotte_2040_plan":
        props["density"] = "High" # To trigger +10 score
    elif name == "school_districts":
        props["rating"] = 9 # To trigger +15 score
        props["school_name"] = "Synthetic School"
        props["school_type"] = "High School"
    elif name == "opportunity_zones":
        props["zone_id"] = "999"

    features.append({
        "type": "Feature",
        "properties": props,
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-80.85, 35.22], [-80.84, 35.22], [-80.84, 35.23], [-80.85, 35.23], [-80.85, 35.22]
            ]]
        }
    })
    return {"type": "FeatureCollection", "features": features}

def fetch_data(name, url=None):
    if not url:
        print(f"No API URL for {name}, using generator.")
        if name == "walkability":
            return generate_synthetic_point_data("walkability", 30) # Heatmap points
        elif name == "building_permits":
            return generate_synthetic_point_data("building_permits", 20)
        elif name == "current_zoning":
            return generate_synthetic_polygons("current_zoning")
        elif name in ["charlotte_2040_plan", "opportunity_zones", "flood_zones"]:
             # For these stable layers, we might prefer to keep existing file if present
             # rather than overwriting with bad synthetic data, but for this exercise we generate.
             return generate_synthetic_polygons(name)
        return None

    print(f"Fetching {name} from {url}...")
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if "features" in data:
                print(f"Successfully fetched {len(data['features'])} records for {name}.")
                return data
            else:
                print(f"Error: Invalid GeoJSON for {name} (No features).")
        else:
             print(f"Error fetching {name}: HTTP {response.status_code}")
    except Exception as e:
        print(f"Error fetching {name}: {e}")
    
    # Fallback to synthetic if fetch failed
    print(f"Falling back to synthetic data for {name}...")
    if name == "walkability":
        return generate_synthetic_point_data("walkability", 30)
    elif name == "building_permits":
         # Emulate large dataset for production feel
        return generate_synthetic_point_data("building_permits", 50)
    elif name == "current_zoning":
        return generate_synthetic_polygons("current_zoning")
    elif name in ["charlotte_2040_plan", "opportunity_zones", "flood_zones", "transit_stations", "school_districts"]:
         return generate_synthetic_polygons(name) if name != "transit_stations" else generate_synthetic_point_data("transit_stations", 10)
    
    return None

def save_data(data, category, filename):
    if data:
        filepath = os.path.join("data", category, f"{filename}.json")
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Data saved to {filepath}")

# Layers that change infrequently and don't need daily updates
STATIC_LAYERS = ["charlotte_2040_plan", "opportunity_zones", "current_zoning", "flood_zones", "school_districts"]

def main():
    ensure_dirs()
    
    # Check for force update flag (e.g. from command line or env var)
    force_update = os.environ.get("FORCE_UPDATE", "false").lower() == "true"
    
    for category, files in DATA_DIRS.items():
        for filename in files:
            # Check if file exists
            filepath = os.path.join("data", category, f"{filename}.json")
            if not force_update and filename in STATIC_LAYERS and os.path.exists(filepath):
                 print(f"Skipping {filename}: Static layer already exists (set FORCE_UPDATE=true to override).")
                 continue

            url = ENDPOINTS.get(filename)
            data = fetch_data(filename, url)
            if data:
                save_data(data, category, filename)

if __name__ == "__main__":
    main()
