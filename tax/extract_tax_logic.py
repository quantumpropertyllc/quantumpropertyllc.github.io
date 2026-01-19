
import xml.etree.ElementTree as ET
import os
import json

sheet_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/worksheets/sheet62.xml'
ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
output_path = '/Volumes/HDD/iOS/2025TaxHtml/modules/tax_tables.js'

def get_value(row, col_letter):
    # Find the cell in the row that corresponds to the column letter
    # This is a bit hacky because 'r' attribute is like 'U7'
    for c in row.findall('a:c', ns):
        coord = c.get('r') 
        # Extract column part
        col = "".join([x for x in coord if x.isalpha()])
        if col == col_letter:
            v_node = c.find('a:v', ns)
            if v_node is not None:
                return float(v_node.text)
            return 0.0
    return 0.0

def extract():
    if not os.path.exists(sheet_path): 
        print("Sheet 62 not found")
        return

    tree = ET.parse(sheet_path)
    root = tree.getroot()
    sheet_data = root.find('a:sheetData', ns)
    
    tables = {
        'single': [],
        'mfj': [],
        'mfs': [],
        'hoh': []
    }
    
    # Ranges identified manually
    ranges = {
        'single': (7, 13),
        'mfj': (17, 23),
        'mfs': (27, 33),
        'hoh': (38, 44)
    }
    
    for row in sheet_data.findall('a:row', ns):
        r_idx = int(row.get('r'))
        
        for status, (start, end) in ranges.items():
            if start <= r_idx <= end:
                # Column S: Rate
                # Column T: Over (Start)
                # Column U: Base Tax
                rate = get_value(row, 'S')
                over = get_value(row, 'T')
                base = get_value(row, 'U')
                
                tables[status].append({
                    'rate': rate,
                    'over': over,
                    'base': base
                })
                
    # Sort just in case
    for status in tables:
        tables[status].sort(key=lambda x: x['over'])
        
    js_content = f"""
/**
 * tax_tables.js - Auto-generated from Excel sheet62.xml
 */
window.TaxCore = window.TaxCore || {{}};
window.TaxCore.TaxTables = {json.dumps(tables, indent=4)};
"""
    
    with open(output_path, 'w') as f:
        f.write(js_content)
    
    print(f"Generated {output_path}")

if __name__ == "__main__":
    extract()
