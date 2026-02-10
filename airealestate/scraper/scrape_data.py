import requests
import json
import os
import random
import time
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

# Rotation Map (0=Monday, 1=Tuesday, etc.)
ROTATION = {
    0: ["rezonings", "charlotte_2040_plan"],           # Monday
    1: ["transit_projects", "cip_projects"],          # Tuesday
    2: ["cmpd_incidents", "flood_zones"],             # Wednesday
    3: ["building_permits", "school_districts"],      # Thursday
    4: ["opportunity_zones", "transit_stations"],     # Friday
    5: ["current_zoning", "walkability"],              # Saturday
    6: [] # Sunday reserved for maintenance
}

# API Endpoints
ENDPOINTS = {
    "rezonings": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Rezonings/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "transit_projects": "https://gis.charlottenc.gov/arcgis/rest/services/CATS/TransitStationDevelopmentPublic/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cip_projects": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Planning_ThingsNearMe/MapServer/6/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cmpd_incidents": "https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?where=YEAR+%3E%3D+%272024%27&outFields=INCIDENT_REPORT_ID,LATITUDE_PUBLIC,LONGITUDE_PUBLIC,HIGHEST_NIBRS_DESCRIPTION,DATE_REPORTED,LOCATION&outSR=4326&f=geojson",
    "school_districts": "https://gis.charlottenc.gov/arcgis/rest/services/CMS/SchoolDistricts/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "transit_stations": "https://gis.charlottenc.gov/arcgis/rest/services/CATS/CATS_Facilities/MapServer/0/query?where=FACILITYTYPE%3D'Light+Rail+Station'&outFields=*&outSR=4326&f=geojson",
    "opportunity_zones": "https://services.mecklenburgcountync.gov/arcgis/rest/services/Economic_Development/Opportunity_Zones/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "building_permits": "https://services.mecklenburgcountync.gov/arcgis/rest/services/Public/BuildingPermitLocations/MapServer/0/query?where=ISSUED_DATE%20%3E%3D%20DATE%20'2024-01-01'&outFields=*&outSR=4326&f=geojson",
    "flood_zones": "https://services.mecklenburgcountync.gov/arcgis/rest/services/Water/Floodplain/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "current_zoning": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Zoning/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "charlotte_2040_plan": "https://services.mecklenburgcountync.gov/arcgis/rest/services/PLN/CLT_Future_2040_Policy_Map/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
}

def ensure_dirs():
    for subdir in DATA_DIRS.keys():
        path = os.path.join("data", subdir)
        if not os.path.exists(path):
            os.makedirs(path)

def fetch_and_save(name, category):
    url = ENDPOINTS.get(name)
    if not url: return
    
    print(f"Updating {name}...")
    try:
        response = requests.get(url, timeout=60)
        if response.status_code == 200:
            data = response.json()
            filepath = os.path.join("data", category, f"{name}.json")
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            print(f"Saved: {filepath}")
    except Exception as e:
        print(f"Failed {name}: {e}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", type=int)
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    ensure_dirs()
    current_day = datetime.now().weekday() if args.day is None else args.day
    targets = ROTATION.get(current_day, [])
    
    for category, files in DATA_DIRS.items():
        for filename in files:
            if args.all or filename in targets:
                fetch_and_save(filename, category)

if __name__ == "__main__":
    main()
