#!/usr/bin/env python3

import json

# Read the file
with open('cyber_paper.json', 'r') as f:
    content = f.read()

# Parse JSON
try:
    data = json.loads(content)
    print("JSON is valid!")
except json.JSONDecodeError as e:
    print(f"JSON Error: {e}")
    
    # Try to fix common duplicate key issues
    # This is a hacky fix but should work for our specific case
    
    # Find the problem area with duplicate keys
    lines = content.split('\n')
    
    # Look for duplicate "4-0-0", "4-0-1", "5-0-0", "5-1-0" keys
    duplicate_keys = ["4-0-0", "4-0-1", "5-0-0", "5-1-0"]
    
    # Track which lines have these keys and their positions
    key_positions = {}
    for i, line in enumerate(lines):
        for key in duplicate_keys:
            if f'"{key}": [' in line:
                if key not in key_positions:
                    key_positions[key] = []
                key_positions[key].append(i)
    
    print("Found duplicate keys at these line numbers:")
    for key, positions in key_positions.items():
        if len(positions) > 1:
            print(f"  {key}: lines {positions}")
    
    # Strategy: Keep only the first occurrence of each duplicate key
    # Mark lines to remove (from second occurrence to the end of that key's array)
    lines_to_remove = set()
    
    for key, positions in key_positions.items():
        if len(positions) > 1:
            # Remove all occurrences except the first
            for pos in positions[1:]:
                # Find the end of this key's array
                bracket_count = 0
                start_line = pos
                end_line = pos
                
                # Find where this array starts and ends
                for j in range(pos, len(lines)):
                    line = lines[j]
                    if '[' in line:
                        bracket_count += line.count('[') - line.count(']')
                    if ']' in line:
                        bracket_count -= line.count(']') - line.count('[')
                    
                    if bracket_count == 0 and j > pos:
                        end_line = j
                        break
                
                # Mark all lines from start_line to end_line+1 for removal
                for line_num in range(start_line, end_line + 2):  # +2 to include the comma after
                    if line_num < len(lines):
                        lines_to_remove.add(line_num)
    
    # Remove the marked lines
    new_lines = []
    for i, line in enumerate(lines):
        if i not in lines_to_remove:
            new_lines.append(line)
    
    # Join back together
    fixed_content = '\n'.join(new_lines)
    
    # Try parsing again
    try:
        data = json.loads(fixed_content)
        print("Fixed JSON successfully!")
        
        # Write the fixed version
        with open('cyber_paper_fixed.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("Saved fixed JSON to cyber_paper_fixed.json")
        
    except json.JSONDecodeError as e2:
        print(f"Still has JSON errors after fix attempt: {e2}")
        
        # Write the partially fixed content for manual inspection
        with open('cyber_paper_partial_fix.json', 'w') as f:
            f.write(fixed_content)
        print("Saved partially fixed content to cyber_paper_partial_fix.json")