#!/usr/bin/env python3
"""
Verification script to check that data sections are properly marked
and ready for OutlineDraft2 to recognize them.
"""

import json

def verify_project_data_sections():
    """Verify that the cyber_paper.json has properly marked data sections"""
    
    json_file_path = '/Users/jimmyobrien/Desktop/00 - code/report_generator/cyber_paper.json'
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        print("🔍 VERIFICATION REPORT: Data Section Markers")
        print("=" * 55)
        
        # Check if the data structure exists
        if 'data' not in data or 'outlineData' not in data['data']:
            print("❌ ERROR: No outlineData found in project file")
            return False
        
        outline_data = data['data']['outlineData']
        data_sections = []
        
        print(f"📊 Total sections in outline: {len(outline_data)}")
        print()
        
        for i, section in enumerate(outline_data):
            section_title = section.get('section_title', 'Unknown')
            is_data = section.get('is_data_section', False)
            section_type = section.get('section_type', 'None')
            category = section.get('category', 'None')
            component = section.get('data_component', 'None')
            
            if is_data:
                data_sections.append(section)
                print(f"✅ DATA SECTION {len(data_sections)}: {section_title}")
                print(f"   📝 Properties:")
                print(f"      - is_data_section: {is_data}")
                print(f"      - section_type: {section_type}")
                print(f"      - category: {category}")
                print(f"      - data_component: {component}")
                
                # Check subsections
                subsections = section.get('subsections', [])
                data_subsections = [s for s in subsections if s.get('is_data_section')]
                print(f"      - total subsections: {len(subsections)}")
                print(f"      - data subsections: {len(data_subsections)}")
                print()
            else:
                print(f"⚪ Regular section: {section_title}")
        
        print("=" * 55)
        print(f"🎯 SUMMARY:")
        print(f"   Total data sections found: {len(data_sections)}")
        
        if len(data_sections) >= 2:
            print(f"   ✅ SUCCESS: {len(data_sections)} data sections properly marked!")
            print(f"   🚀 OutlineDraft2 should now recognize these sections.")
            print()
            print(f"   Data sections:")
            for i, section in enumerate(data_sections, 1):
                component = section.get('data_component', f'Component {i}')
                print(f"      {i}. {section['section_title']} ({component})")
        else:
            print(f"   ⚠️  WARNING: Only {len(data_sections)} data sections found.")
            print(f"   🔧 OutlineDraft2 expects at least 2 data sections.")
        
        print()
        print("=" * 55)
        print("📋 NEXT STEPS FOR USER:")
        print("1. 🔄 Refresh your browser (Ctrl/Cmd + R)")
        print("2. 📁 Load the 'Cyber Paper' project if not already loaded")
        print("3. 🧭 Navigate to the 'Outline Draft' tab")
        print("4. ▶️ Go to OutlineDraft2 (should be Phase 2 button)")
        print("5. 👀 Check browser console (F12) for debug messages")
        print("6. ✅ Look for: 'Found identified data section' messages")
        print("7. ❌ Should NOT see: 'NO DATA SECTIONS IDENTIFIED' error")
        
        return len(data_sections) >= 2
        
    except Exception as e:
        print(f"❌ ERROR: Failed to verify project data: {str(e)}")
        return False

def show_expected_console_output():
    """Show what the user should see in the browser console"""
    
    print("\n" + "=" * 55)
    print("🖥️  EXPECTED BROWSER CONSOLE OUTPUT:")
    print("=" * 55)
    print("When you navigate to OutlineDraft2, you should see:")
    print()
    print("OutlineDraft2: Debugging data sources:")
    print("- preIdentifiedDataSections: null")
    print("- identifiedDataSections: null")
    print("- outlineData type: array")
    print("- outlineData length: [number]")
    print("- draftData: [object]")
    print()
    print("OutlineDraft2: Examining sections in draft1Data: [number]")
    print("OutlineDraft2: Section details:")
    print("  0: \"Title Page\" - is_data_section:undefined, section_type:undefined, category:undefined")
    print("  1: \"Abstract\" - is_data_section:undefined, section_type:undefined, category:undefined")
    print("  [...]")
    print("  X: \"Current US Cybersecurity Framework and Infrastructure\" - is_data_section:true, section_type:data, category:data_section")
    print("  Y: \"Policy Effectiveness and Strategic Gaps\" - is_data_section:true, section_type:data, category:data_section")
    print()
    print("OutlineDraft2: ✅ Found identified data section: Current US Cybersecurity Framework and Infrastructure")
    print("OutlineDraft2: ✅ Found identified data section: Policy Effectiveness and Strategic Gaps")
    print("OutlineDraft2: Final identified data sections count: 2")
    print("OutlineDraft2: Data sections found: [Array of section titles]")
    print()
    print("🎉 If you see the ✅ messages above, the fix is working!")

if __name__ == "__main__":
    success = verify_project_data_sections()
    
    if success:
        show_expected_console_output()
        print("\n🎊 ALL CHECKS PASSED! Your project is ready for OutlineDraft2! 🎊")
    else:
        print("\n💥 VERIFICATION FAILED! Check the errors above and try running update_data_sections.py again.")