#!/usr/bin/env python3
"""
AP Stats Curriculum Processor
Processes allUnitsData.js and associated JSON quiz files to create a consolidated curriculum.
"""

import json
import os
import re
import base64
from pathlib import Path

# Hardcoded image paths that need base64 encoding
HARDCODED_IMAGE_PATHS = [
    'assets/pngs/unit3/u3_l3_q1.png',
    'assets/pngs/unit4/u4_pc_q1.png', 
    'assets/pngs/unit4/u4_pc_frq_q2_b.png',
    'assets/pngs/unit5/u5_l4_q4.png',
    'assets/pngs/Unit5/u5_pc_mcqa_q15.png',
    'assets/pngs/unit6/u6_pc_q2_curves.png',
    'assets/pngs/unit6/u6_pc_q2_curves_solution.png',
    'assets/pngs/unit7/u7_pc_frq_q1bi.png',
    'assets/pngs/unit7/u7_pc_frq_q1c_answer.png'
]

def parse_allunits_data(file_path):
    """Parse allUnitsData.js file and extract the ALL_UNITS_DATA array."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the ALL_UNITS_DATA array using regex
        pattern = r'const\s+ALL_UNITS_DATA\s*=\s*(\[.*?\]);'
        match = re.search(pattern, content, re.DOTALL)
        
        if not match:
            raise ValueError("Could not find ALL_UNITS_DATA array in file")
        
        js_array = match.group(1)
        
        # Much more careful JavaScript to JSON conversion
        lines = js_array.split('\n')
        processed_lines = []
        
        for line in lines:
            # Remove comments but preserve content in strings
            in_string = False
            string_char = None
            i = 0
            new_line = ""
            
            while i < len(line):
                char = line[i]
                
                # Handle string literals
                if char in ['"', "'"] and (i == 0 or line[i-1] != '\\'):
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                        string_char = None
                
                # Handle comments only when not in string
                if not in_string and char == '/' and i + 1 < len(line) and line[i + 1] == '/':
                    # Found comment, truncate line here
                    break
                
                new_line += char
                i += 1
            
            # Clean up the line
            new_line = new_line.rstrip()
            
            # Skip empty lines
            if new_line.strip():
                processed_lines.append(new_line)
        
        js_array = '\n'.join(processed_lines)
        
        # Convert JavaScript object notation to JSON
        # Step 1: Quote unquoted property names
        js_array = re.sub(r'(\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:', r'\1"\2":', js_array)
        
        # Step 2: Convert single quotes to double quotes for strings
        # This is tricky - we need to handle escaped quotes properly
        def replace_single_quotes(match):
            content = match.group(1)
            # Replace escaped single quotes with a placeholder
            content = content.replace("\\'", "__ESCAPED_SINGLE_QUOTE__")
            # Replace escaped double quotes with a placeholder
            content = content.replace('\\"', "__ESCAPED_DOUBLE_QUOTE__")
            # Restore escaped double quotes
            content = content.replace("__ESCAPED_DOUBLE_QUOTE__", '\\"')
            # Restore escaped single quotes as regular single quotes
            content = content.replace("__ESCAPED_SINGLE_QUOTE__", "'")
            return f'"{content}"'
        
        js_array = re.sub(r"'([^']*(?:\\'[^']*)*)'", replace_single_quotes, js_array)
        
        # Step 3: Remove trailing commas
        js_array = re.sub(r',(\s*[}\]])', r'\1', js_array)
        
        # Debug: Save the processed content
        with open('debug_processed.json', 'w', encoding='utf-8') as f:
            f.write(js_array)
        
        # Parse as JSON
        units_data = json.loads(js_array)
        return units_data
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error in allUnitsData.js: {e}")
        print(f"Error at line {e.lineno}, column {e.colno}")
        # Try to show the problematic area
        lines = js_array.split('\n')
        if e.lineno <= len(lines):
            start = max(0, e.lineno - 3)
            end = min(len(lines), e.lineno + 2)
            print("Problematic area:")
            for i in range(start, end):
                marker = " --> " if i == e.lineno - 1 else "     "
                print(f"{marker}Line {i+1}: {lines[i]}")
        return None
    except Exception as e:
        print(f"Error parsing allUnitsData.js: {e}")
        return None

def quiz_id_to_json_filename(quiz_id):
    """Convert quizId like '1-2_q1' to JSON filename like 'ap_stats_u1_l2_quiz.json'."""
    # Extract unit and lesson numbers from quiz_id
    match = re.match(r'(\d+)-(\d+)_q\d+', quiz_id)
    if match:
        unit_num = match.group(1)
        lesson_num = match.group(2)
        return f'ap_stats_u{unit_num}_l{lesson_num}_quiz.json'
    
    # Handle capstone quizzes - expanded possible names
    match = re.match(r'(\d+)-capstone_q\d+', quiz_id)
    if match:
        unit_num = match.group(1)
        # Comprehensive list of capstone patterns
        possible_names = [
            f'ap_stats_u{unit_num}_pc_frq.json',
            f'ap_stats_u{unit_num}_pc_mcq.json',
            f'ap_stats_u{unit_num}_pc_mcq_a.json',
            f'ap_stats_u{unit_num}_pc_mcq_b.json',
            f'ap_stats_u{unit_num}_pc_mcqa.json',
            f'ap_stats_u{unit_num}_pc_mcqb.json',
            f'ap_stats_u{unit_num}_pc_mcqc.json',
            f'u{unit_num}_pc_mcq_a.json',
            f'u{unit_num}_pc_mcq_b.json',
            f'u{unit_num}_pc_mcq_c.json',
            f'ap_stats_u{unit_num}_capstone.json'
        ]
        return possible_names
    
    return None

def find_json_file(base_dir, filename_or_list):
    """Find JSON file in assets/jsons/ directory structure."""
    assets_dir = os.path.join(base_dir, 'assets', 'jsons')
    
    if isinstance(filename_or_list, str):
        filenames = [filename_or_list]
    else:
        filenames = filename_or_list
    
    found_files = []
    
    for filename in filenames:
        # Search in all Unit subdirectories
        for root, dirs, files in os.walk(assets_dir):
            if filename in files:
                found_files.append(os.path.join(root, filename))
    
    return found_files if found_files else None

def strip_all_comments(content):
    """Remove all JavaScript-style comments from content."""
    # Remove single-line comments (// ...)
    content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
    # Remove multi-line comments (/* ... */)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    return content

def load_and_process_json(file_path):
    """Load JSON file with multiple objects, strip comments, and filter for multiple-choice questions."""
    try:
        print(f"    Loading JSON file: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Strip all comments globally
        content = strip_all_comments(content)
        
        # Handle both array format and individual object format
        content = content.strip()
        
        # If content starts with [, it's an array
        if content.startswith('['):
            try:
                # Try to parse as a complete JSON array
                json_array = json.loads(content)
                mcq_questions = []
                
                for item in json_array:
                    if isinstance(item, dict) and item.get('type') == 'multiple-choice':
                        mcq_questions.append(item)
                        print(f"      Array item: MCQ question '{item.get('id', 'unknown')}' added")
                    else:
                        print(f"      Array item: Skipped (type: {item.get('type', 'unknown') if isinstance(item, dict) else 'non-dict'})")
                
                print(f"    Total MCQ questions extracted from array: {len(mcq_questions)}")
                return mcq_questions
                
            except json.JSONDecodeError:
                print(f"    Failed to parse as JSON array, falling back to brace counting")
        
        # Fall back to brace counting for individual objects
        json_blocks = []
        brace_count = 0
        current_block = ""
        in_string = False
        escape_next = False
        
        for char in content:
            if escape_next:
                escape_next = False
                current_block += char
                continue
                
            if char == '\\':
                escape_next = True
                current_block += char
                continue
                
            if char == '"' and not escape_next:
                in_string = not in_string
                current_block += char
                continue
                
            if not in_string:
                if char == '{':
                    if brace_count == 0:
                        current_block = char
                    else:
                        current_block += char
                    brace_count += 1
                elif char == '}':
                    current_block += char
                    brace_count -= 1
                    if brace_count == 0:
                        json_blocks.append(current_block.strip())
                        current_block = ""
                elif brace_count > 0:
                    current_block += char
            else:
                current_block += char
        
        print(f"    Found {len(json_blocks)} JSON blocks")
        
        mcq_questions = []
        
        for i, block in enumerate(json_blocks):
            try:
                # Clean trailing commas from the block
                cleaned_block = re.sub(r',(\s*[}\]])', r'\1', block)
                
                # Parse the JSON block
                json_obj = json.loads(cleaned_block)
                
                # Filter for multiple-choice questions
                if json_obj.get('type') == 'multiple-choice':
                    mcq_questions.append(json_obj)
                    print(f"      Block {i+1}: MCQ question '{json_obj.get('id', 'unknown')}' added")
                else:
                    print(f"      Block {i+1}: Skipped (type: {json_obj.get('type', 'unknown')})")
                    
            except json.JSONDecodeError as e:
                print(f"      Block {i+1}: JSON parse error - {e}")
                continue
            except Exception as e:
                print(f"      Block {i+1}: Error - {e}")
                continue
        
        print(f"    Total MCQ questions extracted: {len(mcq_questions)}")
        return mcq_questions
        
    except Exception as e:
        print(f"    Error processing JSON file {file_path}: {e}")
        return []

def encode_image_to_base64(image_path):
    """Read PNG file and encode to base64 data URI."""
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        base64_data = base64.b64encode(image_data).decode('utf-8')
        return f"data:image/png;base64,{base64_data}"
        
    except Exception as e:
        print(f"Error encoding image {image_path}: {e}")
        return None

def process_mcq_attachments(mcq, base_dir):
    """Process MCQ attachments, converting specified images to base64."""
    if 'attachments' not in mcq:
        return mcq
    
    attachments = mcq['attachments']
    
    if 'image' in attachments:
        image_path = attachments['image']
        
        # Check if this image path is in our hardcoded list
        if image_path in HARDCODED_IMAGE_PATHS:
            full_image_path = os.path.join(base_dir, image_path)
            
            if os.path.exists(full_image_path):
                base64_data = encode_image_to_base64(full_image_path)
                if base64_data:
                    # Add base64 data and preserve alt/caption
                    attachments['imageBase64'] = base64_data
                    if 'alt' in attachments:
                        attachments['alt'] = attachments['alt']
                    if 'caption' in attachments:
                        attachments['caption'] = attachments['caption']
                    
                    # Remove original image key
                    del attachments['image']
                    print(f"        Processed image: {image_path}")
                else:
                    print(f"        Failed to encode image: {image_path}")
            else:
                print(f"        Image file not found: {full_image_path}")
    
    return mcq

def create_unit_lesson_key(unit_id, quiz_id):
    """Create key like 'unit1-1-2' from unitId and quizId."""
    # Extract lesson number from quiz_id
    match = re.match(r'(\d+)-(\d+)_q\d+', quiz_id)
    if match:
        lesson_num = match.group(2)
        return f"{unit_id}-{match.group(1)}-{lesson_num}"
    
    # Handle capstone
    match = re.match(r'(\d+)-capstone_q\d+', quiz_id)
    if match:
        return f"{unit_id}-capstone"
    
    return f"{unit_id}-unknown"

def deduplicate_mcqs(mcq_list):
    """Remove duplicate MCQs based on their 'id' field."""
    seen_ids = set()
    unique_mcqs = []
    
    for mcq in mcq_list:
        mcq_id = mcq.get('id')
        if mcq_id and mcq_id not in seen_ids:
            seen_ids.add(mcq_id)
            unique_mcqs.append(mcq)
        elif mcq_id:
            print(f"        Duplicate MCQ found and removed: {mcq_id}")
    
    return unique_mcqs

def collect_capstone_files_for_unit(unit_id, base_dir):
    """Collect all unique capstone files for a given unit."""
    unit_match = re.search(r'(\d+)', unit_id)
    if not unit_match:
        return []
    
    unit_num = unit_match.group(1)
    
    # Comprehensive list of capstone patterns
    possible_names = [
        f'ap_stats_u{unit_num}_pc_frq.json',
        f'ap_stats_u{unit_num}_pc_mcq.json',
        f'ap_stats_u{unit_num}_pc_mcq_a.json',
        f'ap_stats_u{unit_num}_pc_mcq_b.json',
        f'ap_stats_u{unit_num}_pc_mcqa.json',
        f'ap_stats_u{unit_num}_pc_mcqb.json',
        f'ap_stats_u{unit_num}_pc_mcqc.json',
        f'u{unit_num}_pc_mcq_a.json',
        f'u{unit_num}_pc_mcq_b.json',
        f'u{unit_num}_pc_mcq_c.json',
        f'ap_stats_u{unit_num}_capstone.json'
    ]
    
    # Find all existing files
    found_files = find_json_file(base_dir, possible_names)
    if not found_files:
        return []
    
    # Deduplicate paths (in case same file is found multiple times)
    unique_files = list(set(found_files))
    
    print(f"    [CAPSTONE] Found {len(unique_files)} unique capstone files for {unit_id}")
    for file_path in unique_files:
        print(f"      {os.path.basename(file_path)}")
    
    return unique_files

def main():
    """Main function to process curriculum data."""
    # Get base directory (assume current directory or prompt user)
    base_dir = os.getcwd()
    
    # Check if we're in the right directory
    allunits_file = os.path.join(base_dir, 'allUnitsData.js')
    if not os.path.exists(allunits_file):
        print(f"allUnitsData.js not found in {base_dir}")
        print("Please ensure you're running this script from the correct directory.")
        return
    
    print(f"Processing curriculum data from: {base_dir}")
    
    # Parse allUnitsData.js
    units_data = parse_allunits_data(allunits_file)
    if not units_data:
        print("Failed to parse allUnitsData.js")
        return
    
    print(f"Found {len(units_data)} units")
    
    # Process each unit
    curriculum_data = {}
    capstone_stats = {
        'files_found': 0,
        'mcqs_found': 0,
        'units_processed': []
    }
    
    # Track processed capstone units to avoid reprocessing
    processed_capstone_units = set()
    
    for unit in units_data:
        unit_id = unit.get('unitId', '')
        print(f"\nProcessing {unit_id}...")
        
        if 'topics' not in unit:
            continue
            
        for topic in unit['topics']:
            if 'quizzes' not in topic:
                continue
                
            for quiz in topic['quizzes']:
                quiz_id = quiz.get('quizId', '')
                if not quiz_id:
                    continue
                
                print(f"  Processing quiz: {quiz_id}")
                
                # Check if this is a capstone quiz
                is_capstone = 'capstone' in quiz_id
                
                if is_capstone:
                    # For capstone quizzes, process all files for this unit only once
                    if unit_id in processed_capstone_units:
                        print(f"    [CAPSTONE] Already processed capstone for {unit_id}, skipping")
                        continue
                    
                    print(f"    [CAPSTONE] Processing capstone files for {unit_id}")
                    processed_capstone_units.add(unit_id)
                    
                    # Collect all unique capstone files for this unit
                    capstone_files = collect_capstone_files_for_unit(unit_id, base_dir)
                    
                    if not capstone_files:
                        print(f"    [CAPSTONE] No capstone files found for {unit_id}")
                        continue
                    
                    # Process all capstone files and collect MCQs
                    all_capstone_mcqs = []
                    
                    for file_path in capstone_files:
                        capstone_stats['files_found'] += 1
                        print(f"    [CAPSTONE] Processing file: {os.path.basename(file_path)}")
                        
                        # Load and process JSON
                        mcq_questions = load_and_process_json(file_path)
                        
                        if mcq_questions:
                            # Process attachments for each MCQ
                            processed_mcqs = []
                            for mcq in mcq_questions:
                                processed_mcq = process_mcq_attachments(mcq, base_dir)
                                processed_mcqs.append(processed_mcq)
                            
                            all_capstone_mcqs.extend(processed_mcqs)
                            print(f"    [CAPSTONE] Added {len(processed_mcqs)} MCQs from {os.path.basename(file_path)}")
                        else:
                            print(f"    [CAPSTONE] No MCQ questions found in {os.path.basename(file_path)}")
                    
                    # Deduplicate MCQs by ID
                    unique_mcqs = deduplicate_mcqs(all_capstone_mcqs)
                    print(f"    [CAPSTONE] Unique MCQs after dedupe: {len(unique_mcqs)}")
                    
                    if unique_mcqs:
                        # Create capstone key and store data
                        capstone_key = f"{unit_id}-capstone"
                        curriculum_data[capstone_key] = unique_mcqs
                        capstone_stats['mcqs_found'] += len(unique_mcqs)
                        
                        unit_match = re.search(r'(\d+)', unit_id)
                        unit_num = unit_match.group(1) if unit_match else unit_id
                        if unit_num not in capstone_stats['units_processed']:
                            capstone_stats['units_processed'].append(unit_num)
                        
                        print(f"    [CAPSTONE] Added {len(unique_mcqs)} unique MCQs to key: {capstone_key}")
                
                else:
                    # Regular lesson quiz processing
                    # Convert quiz_id to JSON filename
                    json_filename = quiz_id_to_json_filename(quiz_id)
                    if not json_filename:
                        print(f"    Could not determine JSON filename for {quiz_id}")
                        continue
                    
                    # Find the JSON file(s)
                    json_file_paths = find_json_file(base_dir, json_filename)
                    if not json_file_paths:
                        print(f"    JSON file(s) not found for {quiz_id}")
                        continue
                    
                    # Process all found files
                    all_mcqs = []
                    
                    for json_file_path in json_file_paths:
                        print(f"    Found JSON: {json_file_path}")
                        
                        # Load and process JSON
                        mcq_questions = load_and_process_json(json_file_path)
                        
                        if mcq_questions:
                            # Process attachments for each MCQ
                            processed_mcqs = []
                            for mcq in mcq_questions:
                                processed_mcq = process_mcq_attachments(mcq, base_dir)
                                processed_mcqs.append(processed_mcq)
                            
                            all_mcqs.extend(processed_mcqs)
                        else:
                            print(f"    No MCQ questions found in {json_file_path}")
                    
                    if all_mcqs:
                        # Create key and store data
                        key = create_unit_lesson_key(unit_id, quiz_id)
                        if key not in curriculum_data:
                            curriculum_data[key] = []
                        
                        curriculum_data[key].extend(all_mcqs)
                        print(f"    Added {len(all_mcqs)} MCQs to key: {key}")
    
    # Write output file
    output_file = os.path.join(base_dir, 'pok_curriculum.json')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(curriculum_data, f, indent=4, ensure_ascii=False)
        
        print(f"\nSuccessfully created: {output_file}")
        print(f"Total curriculum keys: {len(curriculum_data)}")
        
        # Print summary
        total_questions = sum(len(questions) for questions in curriculum_data.values())
        print(f"Total MCQ questions: {total_questions}")
        
        # Print capstone statistics
        print(f"\n=== CAPSTONE STATISTICS ===")
        print(f"Capstone files processed: {capstone_stats['files_found']}")
        print(f"Capstone MCQs found: {capstone_stats['mcqs_found']}")
        print(f"Units with capstone data: {sorted(capstone_stats['units_processed'])}")
        
        # Print key distribution
        print("\nKey distribution:")
        for key, questions in sorted(curriculum_data.items()):
            capstone_marker = " [CAPSTONE]" if "capstone" in key else ""
            print(f"  {key}: {len(questions)} questions{capstone_marker}")
        
    except Exception as e:
        print(f"Error writing output file: {e}")

if __name__ == "__main__":
    main() 