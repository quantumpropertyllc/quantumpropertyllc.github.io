import requests
import json
import os
import argparse
from datetime import datetime

# Configuration
DATA_DIRS = {
    "planning": ["rezonings", "charlotte_2040_plan", "opportunity_zones", "current_zoning"],
    "infrastructure": ["transit_projects", "cip_projects", "transit_stations"],
    "risk": ["cmpd_incidents", "flood_zones"],
    "development": ["building_permits", "school_districts"],
    "lifestyle": ["walkability"]
}

# PROTECTED: These files are large, complex, or manually optimized. 
# The scraper will NEVER overwrite these to prevent data loss or corruption.
PROTECTED_LAYERS = [
    "flood_zones",         # 200MB+ large dataset
    "charlotte_2040_plan", # Processed static geometry
    "transit_stations",    # Combined from multiple sources
    "walkability",         # No direct verified API
    "building_permits",    # Unverified API source
    "opportunity_zones",   # Static manual data
    "current_zoning"       # Static manual data
]

# Rotation Map: ONLY includes small, reliable, dynamic layers.
ROTATION = {
    0: ["rezonings"],                  # Monday
    1: ["transit_projects", "cip_projects"], # Tuesday
    2: ["cmpd_incidents"],             # Wednesday
    3: ["school_districts"],           # Thursday
    4: [],                             # Friday (Reserved)
    5: [],                             # Saturday (Reserved)
    6: []                              # Sunday (Reserved)
}

# API Endpoints for Verified Dynamic Layers
ENDPOINTS = {
    "rezonings": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Rezonings/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "transit_projects": "https://gis.charlottenc.gov/arcgis/rest/services/CATS/TransitStationDevelopmentPublic/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cip_projects": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Planning_ThingsNearMe/MapServer/6/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cmpd_incidents": "https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?where=YEAR+%3E%3D+%272024%27&outFields=INCIDENT_REPORT_ID,LATITUDE_PUBLIC,LONGITUDE_PUBLIC,HIGHEST_NIBRS_DESCRIPTION,DATE_REPORTED,LOCATION&outSR=4326&f=geojson",
    "school_districts": "https://gis.charlottenc.gov/arcgis/rest/services/CMS/SchoolDistricts/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
}

def ensure_dirs():
    for subdir in DATA_DIRS.keys():
        path = os.path.join("data", subdir)
        if not os.path.exists(path):
            os.makedirs(path)

def fetch_data(name, url):
    print(f"Fetching {name}...")
    try:
        response = requests.get(url, timeout=60)
        if response.status_code == 200:
            data = response.json()
            if "features" in data and len(data["features"]) > 0:
                print(f"Successfully fetched {len(data['features'])} records for {name}.")
                return data
            else:
                print(f"Error: Empty or invalid data received for {name}.")
    except Exception as e:
        print(f"Error fetching {name}: {e}")
    return None

def save_data(data, category, filename):
    filepath = os.path.join("data", category, f"{filename}.json")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Data updated at {filepath}")

def main():
    parser = argparse.ArgumentParser(description="Secure Charlotte Data Scraper")
    parser.add_argument("--day", type=int, help="Force update for a specific day (0=Mon, 6=Sun)")
    parser.add_argument("--all", action="store_true", help="Attempt update for all safe layers")
    args = parser.parse_args()

    ensure_dirs()
    
    current_day = datetime.now().weekday() if args.day is None else args.day
    targets = ROTATION.get(current_day, [])
    
    if args.all:
        targets = [item for sublist in ROTATION.values() for item in sublist]
        print("Mode: Full Safe Update requested.")

    if not targets:
        print(f"No safe tasks scheduled for day {current_day}. Skipping automation.")
        return

    print(f"Active Targets: {', '.join(targets)}")

    for category, files in DATA_DIRS.items():
        for filename in files:
            # SAFETY CHECK 1: Never Touch Protected Layers
            if filename in PROTECTED_LAYERS:
                if filename in targets or args.all:
                    print(f"CRITICAL SKIP: {filename} is PROTECTED and requires manual optimization. Automation cancelled for this file.")
                continue

            # SAFETY CHECK 2: Only Run Targeted Layers
            if filename in targets:
                url = ENDPOINTS.get(filename)
                if not url:
                    print(f"Warning: No endpoint defined for dynamic layer {filename}.")
                    continue

                data = fetch_data(filename, url)
                if data:
                    save_data(data, category, filename)
                else:
                    print(f"FAILED: Could not update {filename}. Current data remains untouched.")

if __name__ == "__main__":
    main()
