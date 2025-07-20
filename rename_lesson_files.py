#!/usr/bin/env python3
"""
Script to rename AP Statistics lesson files with zero-padded lesson numbers.

This script renames files like:
- ap_stats_u1_l2_quiz.json -> ap_stats_u1_l02_quiz.json
- ap_stats_u1_l10_quiz.json -> ap_stats_u1_l10_quiz.json (already 2 digits)

It processes all units in the assets/jsons/ directory.
"""

import os
import re
import glob
from pathlib import Path

def rename_lesson_files(base_dir="assets/jsons"):
    """
    Rename lesson files to use zero-padded lesson numbers.
    
    Args:
        base_dir (str): Base directory containing unit folders
    """
    
    # Pattern to match lesson files: ap_stats_u{unit}_l{lesson}_{type}.json
    lesson_pattern = re.compile(r'^(ap_stats_u\d+_l)(\d+)(_.*\.json)$')
    
    # Get all unit directories
    unit_dirs = glob.glob(os.path.join(base_dir, "Unit*"))
    
    if not unit_dirs:
        print(f"No unit directories found in {base_dir}")
        return
    
    total_renamed = 0
    
    for unit_dir in sorted(unit_dirs):
        unit_name = os.path.basename(unit_dir)
        print(f"\nProcessing {unit_name}...")
        
        # Get all JSON files in this unit directory
        json_files = glob.glob(os.path.join(unit_dir, "*.json"))
        
        renamed_in_unit = 0
        
        for file_path in json_files:
            filename = os.path.basename(file_path)
            
            # Check if this is a lesson file that needs renaming
            match = lesson_pattern.match(filename)
            
            if match:
                prefix = match.group(1)  # ap_stats_u1_l
                lesson_num = match.group(2)  # the lesson number
                suffix = match.group(3)  # _quiz.json or similar
                
                # Only rename if lesson number is single digit
                if len(lesson_num) == 1:
                    new_lesson_num = f"0{lesson_num}"
                    new_filename = f"{prefix}{new_lesson_num}{suffix}"
                    new_file_path = os.path.join(unit_dir, new_filename)
                    
                    print(f"  Renaming: {filename} -> {new_filename}")
                    
                    try:
                        os.rename(file_path, new_file_path)
                        renamed_in_unit += 1
                        total_renamed += 1
                    except OSError as e:
                        print(f"  Error renaming {filename}: {e}")
                else:
                    print(f"  Skipping {filename} (already multi-digit: l{lesson_num})")
            else:
                # Check if it's a progress check file (should be skipped)
                if "_pc_" in filename:
                    print(f"  Skipping progress check file: {filename}")
                else:
                    print(f"  Skipping non-lesson file: {filename}")
        
        print(f"  Renamed {renamed_in_unit} files in {unit_name}")
    
    print(f"\nTotal files renamed: {total_renamed}")

def preview_changes(base_dir="assets/jsons"):
    """
    Preview what changes would be made without actually renaming files.
    
    Args:
        base_dir (str): Base directory containing unit folders
    """
    
    lesson_pattern = re.compile(r'^(ap_stats_u\d+_l)(\d+)(_.*\.json)$')
    unit_dirs = glob.glob(os.path.join(base_dir, "Unit*"))
    
    if not unit_dirs:
        print(f"No unit directories found in {base_dir}")
        return
    
    print("PREVIEW MODE - No files will be renamed")
    print("=" * 50)
    
    total_to_rename = 0
    
    for unit_dir in sorted(unit_dirs):
        unit_name = os.path.basename(unit_dir)
        print(f"\n{unit_name}:")
        
        json_files = glob.glob(os.path.join(unit_dir, "*.json"))
        to_rename_in_unit = 0
        
        for file_path in json_files:
            filename = os.path.basename(file_path)
            match = lesson_pattern.match(filename)
            
            if match:
                prefix = match.group(1)
                lesson_num = match.group(2)
                suffix = match.group(3)
                
                if len(lesson_num) == 1:
                    new_lesson_num = f"0{lesson_num}"
                    new_filename = f"{prefix}{new_lesson_num}{suffix}"
                    print(f"  {filename} -> {new_filename}")
                    to_rename_in_unit += 1
                    total_to_rename += 1
        
        if to_rename_in_unit == 0:
            print("  No files to rename in this unit")
    
    print(f"\nTotal files that would be renamed: {total_to_rename}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--preview":
        preview_changes()
    else:
        print("AP Statistics Lesson File Renamer")
        print("=" * 40)
        
        # Show preview first
        preview_changes()
        
        print("\n" + "=" * 50)
        response = input("Do you want to proceed with renaming? (y/N): ")
        
        if response.lower() in ['y', 'yes']:
            rename_lesson_files()
        else:
            print("Renaming cancelled.") 