#!/usr/bin/env python3
"""
Script to copy pok_application.html and replace empty POK_WORDLIST and POK_CURRICULUM
with filled versions from pok_application_preview.html
"""

import re
import os

def extract_data_from_preview(preview_file):
    """Extract POK_WORDLIST and POK_CURRICULUM from the preview file"""
    with open(preview_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the start of POK_WORDLIST
    wordlist_start = content.find('const POK_WORDLIST = [')
    if wordlist_start == -1:
        raise ValueError("Could not find POK_WORDLIST in preview file")
    
    # Find the end of POK_WORDLIST (look for the closing bracket and semicolon)
    wordlist_end = content.find('];', wordlist_start)
    if wordlist_end == -1:
        raise ValueError("Could not find end of POK_WORDLIST in preview file")
    
    # Extract the full POK_WORDLIST declaration
    wordlist_content = content[wordlist_start:wordlist_end + 2]  # +2 to include '];'
    
    # Find the start of POK_CURRICULUM
    curriculum_start = content.find('const POK_CURRICULUM = {', wordlist_end)
    if curriculum_start == -1:
        raise ValueError("Could not find POK_CURRICULUM in preview file")
    
    # Find the end of POK_CURRICULUM by counting braces
    brace_count = 0
    i = curriculum_start + len('const POK_CURRICULUM = ')
    start_brace_found = False
    
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
            start_brace_found = True
        elif content[i] == '}':
            brace_count -= 1
            if start_brace_found and brace_count == 0:
                # Found the closing brace, now look for the semicolon
                j = i + 1
                while j < len(content) and content[j] in ' \t\n\r':
                    j += 1
                if j < len(content) and content[j] == ';':
                    curriculum_end = j
                    break
                else:
                    curriculum_end = i
                    break
        i += 1
    
    if brace_count != 0:
        raise ValueError("Could not find properly closed POK_CURRICULUM in preview file")
    
    # Extract the full POK_CURRICULUM declaration
    curriculum_content = content[curriculum_start:curriculum_end + 1]  # +1 to include ';'
    
    return wordlist_content, curriculum_content

def replace_data_in_application(app_file, wordlist_content, curriculum_content, output_file):
    """Replace empty POK_WORDLIST and POK_CURRICULUM in application file"""
    with open(app_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace POK_WORDLIST
    wordlist_pattern = r'const POK_WORDLIST = \[/\* \.\.\. PASTE HERE \.\.\. \*/\];'
    content = re.sub(wordlist_pattern, wordlist_content, content)
    
    # Replace POK_CURRICULUM
    curriculum_pattern = r'const POK_CURRICULUM = \{/\* \.\.\. PASTE HERE \.\.\. \*/\};'
    content = re.sub(curriculum_pattern, curriculum_content, content)
    
    # Write to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    # File paths
    preview_file = 'pok_application_preview.html'
    app_file = 'pok_application.html'
    output_file = 'pok_application_complete.html'
    
    # Check if files exist
    if not os.path.exists(preview_file):
        print(f"Error: {preview_file} not found")
        return
    
    if not os.path.exists(app_file):
        print(f"Error: {app_file} not found")
        return
    
    try:
        print("Extracting data from preview file...")
        wordlist_content, curriculum_content = extract_data_from_preview(preview_file)
        
        print("Replacing data in application file...")
        replace_data_in_application(app_file, wordlist_content, curriculum_content, output_file)
        
        print(f"Successfully created {output_file}")
        print(f"POK_WORDLIST: {len(wordlist_content)} characters")
        print(f"POK_CURRICULUM: {len(curriculum_content)} characters")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()