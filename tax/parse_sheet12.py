
import xml.etree.ElementTree as ET
import os
import re

shared_strings_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/sharedStrings.xml'
sheet_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/worksheets/sheet12.xml'

ns_main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
ns = {'a': ns_main}

def load_shared_strings():
    if not os.path.exists(shared_strings_path): return []
    try:
        tree = ET.parse(shared_strings_path)
        root = tree.getroot()
        strings = []
        for si in root.findall('a:si', ns):
            text_nodes = si.findall('.//a:t', ns)
            text = "".join([t.text for t in text_nodes if t.text])
            strings.append(text)
        return strings
    except: return []

def parse_sheet(strings):
    if not os.path.exists(sheet_path): return
    try:
        tree = ET.parse(sheet_path)
        root = tree.getroot()
        sheet_data = root.find('a:sheetData', ns)
        
        print("Row,Col,Value,Formula")
        
        for row in sheet_data.findall('a:row', ns):
            r_idx = row.get('r')
            if int(r_idx) > 100: break # Interact only first 100 rows for now
            
            for c in row.findall('a:c', ns):
                coord = c.get('r') # e.g. A1
                t = c.get('t')
                val = ""
                v_node = c.find('a:v', ns)
                if v_node is not None:
                    if t == 's':
                        idx = int(v_node.text)
                        if idx < len(strings):
                            val = strings[idx]
                        else:
                            val = f"STRING#{idx}"
                    else:
                        val = v_node.text
                
                f_node = c.find('a:f', ns)
                formula = ""
                if f_node is not None:
                    formula = f_node.text
                    
                # Clean up newlines for csv
                val = str(val).replace('\n', ' ').replace('\r', '')
                if val or formula:
                    print(f"{coord},{val},{formula}")
                    
    except Exception as e:
        print(f"Error parsing sheet: {e}")

strings = load_shared_strings()
parse_sheet(strings)
