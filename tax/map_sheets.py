
import xml.etree.ElementTree as ET
import os

workbook_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/workbook.xml'
rels_path = '/Volumes/HDD/iOS/2025TaxHtml/temp_xlsx_extract/xl/_rels/workbook.xml.rels'

ns = {'judge': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'pkg': 'http://schemas.openxmlformats.org/package/2006/relationships'}

try:
    # 1. Map Sheet Name -> r:id
    wb_tree = ET.parse(workbook_path)
    wb_root = wb_tree.getroot()
    
    sheet_map = {}
    for sheet in wb_root.findall('.//judge:sheet', ns):
        name = sheet.get('name')
        rid = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id') # r:id
        sheet_map[name] = rid
        
    print(f"Sheet Mapping (Name -> r:id): {sheet_map}")
    
    # 2. Map r:id -> Target Filename
    rels_tree = ET.parse(rels_path)
    rels_root = rels_tree.getroot()
    
    rid_map = {}
    for rel in rels_root.findall('.//pkg:Relationship', ns):
        rid_map[rel.get('Id')] = rel.get('Target')
        
    print(f"Relationship Mapping (r:id -> Target): {rid_map}")
    
    target_sheet = "1040"
    if target_sheet in sheet_map:
        rid = sheet_map[target_sheet]
        target_file = rid_map.get(rid)
        print(f"Target Sheet '{target_sheet}' is in file: {target_file}")
    else:
        print(f"Sheet '{target_sheet}' not found.")

except Exception as e:
    print(f"Error: {e}")
