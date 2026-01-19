
import xml.etree.ElementTree as ET
import os
import json

sheet_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/worksheets/sheet12.xml'
ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
output_path = '/Volumes/HDD/iOS/2025TaxHtml/modules/constants.js'

def get_value(row, col_letter):
    for c in row.findall('a:c', ns):
        coord = c.get('r') 
        col = "".join([x for x in coord if x.isalpha()])
        if col == col_letter:
            v_node = c.find('a:v', ns)
            if v_node is not None:
                return float(v_node.text)
    return None

def extract():
    if not os.path.exists(sheet_path): 
        print("Sheet 12 not found")
        return

    tree = ET.parse(sheet_path)
    root = tree.getroot()
    sheet_data = root.find('a:sheetData', ns)
    
    constants = {
        'standardDeduction': {
            'single': 0,
            'mfj': 0,
            'mfs': 0,
            'hoh': 0,
            'qw': 0
        }
    }

    # Based on visual inspection of explore_sheet12.py output:
    # Row 80 (BI80): 31500 (MFJ / QW)
    # Row 81 (BI81): 15750 (Single / MFS)
    # Row 82 (BI82): 23625 (HOH)
    
    for row in sheet_data.findall('a:row', ns):
        r_idx = int(row.get('r'))
        
        if r_idx == 80:
            val = get_value(row, 'BI')
            if val:
                constants['standardDeduction']['mfj'] = val
                constants['standardDeduction']['qw'] = val
        
        elif r_idx == 81:
            val = get_value(row, 'BI')
            if val:
                constants['standardDeduction']['single'] = val
                constants['standardDeduction']['mfs'] = val
                
        elif r_idx == 82:
            val = get_value(row, 'BI')
            if val:
                constants['standardDeduction']['hoh'] = val

    js_content = f"""
/**
 * constants.js - Auto-generated from Excel sheet12.xml
 */
window.TaxCore = window.TaxCore || {{}};
window.TaxCore.Constants = {json.dumps(constants, indent=4)};
"""
    
    with open(output_path, 'w') as f:
        f.write(js_content)
    
    print(f"Generated {output_path}")

if __name__ == "__main__":
    extract()
