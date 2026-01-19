
import xml.etree.ElementTree as ET
import os

sheet_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/worksheets/sheet62.xml'
ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def parse_tax_table():
    if not os.path.exists(sheet_path): 
        print("Sheet 62 not found")
        return
    try:
        tree = ET.parse(sheet_path)
        root = tree.getroot()
        sheet_data = root.find('a:sheetData', ns)
        
        # We are looking for U7 to U40 approx
        # U is col index 21 (A=1) -> "U"
        
        print("Cell,Value")
        
        for row in sheet_data.findall('a:row', ns):
            r_idx = int(row.get('r'))
            if r_idx < 5 or r_idx > 50: continue
            
            for c in row.findall('a:c', ns):
                coord = c.get('r') # e.g. U7
                # Check if column is U
                if not coord.startswith('U'): continue
                
                val = ""
                v_node = c.find('a:v', ns)
                if v_node is not None:
                    val = v_node.text
                
                print(f"{coord},{val}")
                    
    except Exception as e:
        print(f"Error parsing sheet: {e}")

parse_tax_table()
