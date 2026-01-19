
import xml.etree.ElementTree as ET
import os

workbook_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/workbook.xml'
ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

try:
    tree = ET.parse(workbook_path)
    root = tree.getroot()
    
    defined_names = []
    
    for dn in root.findall('.//main:definedName', ns):
        name = dn.get('name')
        content = dn.text
        defined_names.append((name, content))
        
    print(f"Found {len(defined_names)} defined names.")
    print("Sample Defined Names:")
    for name, content in defined_names[:50]:
        print(f"{name} = {content}")

    # Search for specific interesting names
    interesting = ['Total_Income', 'Adj_Gross_Inc', 'Standard', 'TaxYear', 'SD_Single']
    print("\n--- Interesting Names ---")
    for name, content in defined_names:
        if name in interesting:
            print(f"{name} = {content}")

except Exception as e:
    print(f"Error: {e}")
