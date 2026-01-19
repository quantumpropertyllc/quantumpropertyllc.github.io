
import xml.etree.ElementTree as ET
import os

shared_strings_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/sharedStrings.xml'

if not os.path.exists(shared_strings_path):
    print("sharedStrings.xml not found!")
    # List files in xl just in case
    print(os.listdir('/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/'))
    exit()

try:
    tree = ET.parse(shared_strings_path)
    root = tree.getroot()
    # Namespace is usually required.
    # The default namespace for spreadsheetml is often http://schemas.openxmlformats.org/spreadsheetml/2006/main
    ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    
    strings = []
    for si in root.findall('a:si', ns):
        # Text can be in 't' or 'r/t'
        text_nodes = si.findall('.//a:t', ns)
        text = "".join([t.text for t in text_nodes if t.text])
        strings.append(text)
        
    print(f"Found {len(strings)} unique strings.")
    print("First 100 strings:")
    for s in strings[:100]:
        print(s)

except Exception as e:
    print(f"Error parsing XML: {e}")
