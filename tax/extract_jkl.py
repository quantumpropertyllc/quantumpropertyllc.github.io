
import xml.etree.ElementTree as ET
import os

sheet_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/worksheets/sheet62.xml'
ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def parse_tax_table():
    if not os.path.exists(sheet_path): return
    try:
        tree = ET.parse(sheet_path)
        root = tree.getroot()
        sheet_data = root.find('a:sheetData', ns)
        
        print("Cell,Value")
        
        for row in sheet_data.findall('a:row', ns):
            r_idx = int(row.get('r'))
            if r_idx < 5 or r_idx > 50: continue
            
            for c in row.findall('a:c', ns):
                coord = c.get('r') # e.g. J7
                # Check for J, K, L
                col_letter = "".join([x for x in coord if x.isalpha()])
                if col_letter not in ['J', 'K', 'L']: continue
                
                val = ""
                v_node = c.find('a:v', ns)
                if v_node is not None:
                    val = v_node.text
                
                print(f"{coord},{val}")
                    
    except Exception as e:
        print(f"Error parsing sheet: {e}")

parse_tax_table()
