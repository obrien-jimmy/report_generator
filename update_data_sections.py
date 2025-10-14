#!/usr/bin/env python3
"""
Script to update cyber_paper.json with proper data section markers
for OutlineDraft2 to recognize data sections correctly.
"""

import json
import os

def update_data_sections():
    """Update the cyber_paper.json to include data section markers"""
    
    json_file_path = '/Users/jimmyobrien/Desktop/00 - code/report_generator/cyber_paper.json'
    
    # Load the existing JSON data
    with open(json_file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # Check if outlineData exists
    if 'data' not in data or 'outlineData' not in data['data']:
        print("No outlineData found in the JSON file")
        return
    
    outline_data = data['data']['outlineData']
    
    # Define which sections should be marked as data sections
    data_section_titles = {
        "Current US Cybersecurity Framework and Infrastructure": {
            "section_type": "data",
            "category": "data_section",
            "is_data_section": True,
            "data_component": "Component 1"
        },
        "Policy Effectiveness and Strategic Gaps": {
            "section_type": "data", 
            "category": "data_section",
            "is_data_section": True,
            "data_component": "Component 2"
        }
    }
    
    # Update sections with data markers
    updated_count = 0
    for section in outline_data:
        if section.get('section_title') in data_section_titles:
            markers = data_section_titles[section['section_title']]
            # Add the data section markers
            section.update(markers)
            updated_count += 1
            print(f"✅ Updated section: '{section['section_title']}' with data markers")
            
            # Also mark subsections as data-related if they exist
            if 'subsections' in section:
                for subsection in section['subsections']:
                    subsection['is_data_section'] = True
                    subsection['section_type'] = 'data'
                    subsection['category'] = 'data_section'
                    print(f"   ↳ Updated subsection: '{subsection.get('subsection_title', 'Unknown')}'")
    
    if updated_count > 0:
        # Create a backup of the original file
        backup_path = json_file_path + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as backup_file:
            json.dump(data, backup_file, indent=2, ensure_ascii=False)
        print(f"📋 Created backup at: {backup_path}")
        
        # Write the updated data back to the file
        with open(json_file_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
        
        print(f"🎉 Successfully updated {updated_count} sections in {json_file_path}")
        print("\nThe following sections are now marked as data sections:")
        for section in outline_data:
            if section.get('is_data_section'):
                print(f"  - {section['section_title']} ({section.get('data_component', 'Data Component')})")
    else:
        print("❌ No matching sections found to update")
    
    return updated_count

def verify_data_sections():
    """Verify that data sections are properly marked"""
    
    json_file_path = '/Users/jimmyobrien/Desktop/00 - code/report_generator/cyber_paper.json'
    
    with open(json_file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    outline_data = data['data']['outlineData']
    
    print("\n🔍 Verification Report:")
    print("=" * 50)
    
    data_sections_found = []
    
    for section in outline_data:
        is_data = section.get('is_data_section', False)
        section_type = section.get('section_type', 'None')
        category = section.get('category', 'None')
        component = section.get('data_component', 'None')
        
        if is_data:
            data_sections_found.append(section)
            print(f"✅ DATA SECTION: {section['section_title']}")
            print(f"   - is_data_section: {is_data}")
            print(f"   - section_type: {section_type}")
            print(f"   - category: {category}")
            print(f"   - data_component: {component}")
            print(f"   - subsections: {len(section.get('subsections', []))}")
            print()
    
    print(f"📊 Total data sections found: {len(data_sections_found)}")
    
    if len(data_sections_found) >= 2:
        print("🎯 SUCCESS: OutlineDraft2 should now recognize these data sections!")
    else:
        print("⚠️  WARNING: Less than 2 data sections found. OutlineDraft2 may not work properly.")
    
    return data_sections_found

if __name__ == "__main__":
    print("🔧 Updating cyber_paper.json with data section markers...")
    print("=" * 60)
    
    updated_count = update_data_sections()
    
    if updated_count > 0:
        print("\n" + "=" * 60)
        verify_data_sections()
        
        print("\n" + "=" * 60)
        print("🚀 NEXT STEPS:")
        print("1. Reload your React app (Ctrl/Cmd + R)")
        print("2. Navigate to OutlineDraft2")
        print("3. Check browser console for debug output")
        print("4. You should see: '✅ Found identified data section' messages")
        print("5. No more '❌ Section not marked as data section' or 'NO DATA SECTIONS IDENTIFIED'")
    else:
        print("\n❌ Update failed. Check the section titles in the JSON file.")