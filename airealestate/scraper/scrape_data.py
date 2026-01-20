import requests
import json
import os
import time

# Configuration
DATA_DIR = "data"

# API Endpoints
ENDPOINTS = {
    "rezonings": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Rezonings/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "transit_projects": "https://gis.charlottenc.gov/arcgis/rest/services/CATS/TransitStationDevelopmentPublic/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cip_projects": "https://gis.charlottenc.gov/arcgis/rest/services/PLN/Planning_ThingsNearMe/MapServer/6/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    "cmpd_incidents": "https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query?where=YEAR+%3E%3D+%272024%27&outFields=INCIDENT_REPORT_ID,LATITUDE_PUBLIC,LONGITUDE_PUBLIC,HIGHEST_NIBRS_DESCRIPTION,DATE_REPORTED,LOCATION&outSR=4326&f=geojson"
}

def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def fetch_data(name, url):
    print(f"Fetching {name} from {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Basic validation
        if "features" in data:
            count = len(data["features"])
            print(f"Successfully fetched {count} records for {name}.")
            return data
        else:
            print(f"Error: Invalid GeoJSON format received for {name}. Response keys: {list(data.keys())}")
            if "error" in data:
                print(f"API Error details: {data['error']}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {name}: {e}")
        return None

def save_data(data, filename):
    if data:
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Data saved to {filepath}")

def main():
    ensure_data_dir()
    
    for name, url in ENDPOINTS.items():
        data = fetch_data(name, url)
        save_data(data, f"{name}.json")

if __name__ == "__main__":
    main()
