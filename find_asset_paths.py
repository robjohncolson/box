#!/usr/bin/env python3
"""
Script to find "assetPath" strings in JSON files and extract surrounding context.
Searches through all JSON files in assets/jsons directory and subdirectories.
"""

import os
import json
import glob
from pathlib import Path

def find_asset_paths_in_json_files(base_dir="assets/jsons"):
    """
    Search for "assetPath" in all JSON files within the specified directory.
    Returns context (3 lines above and below) for each match.
    """
    results = []
    
    # Get all JSON files recursively
    json_files = glob.glob(os.path.join(base_dir, "**/*.json"), recursive=True)
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Search for "assetPath" in each line
            for i, line in enumerate(lines):
                if "png" in line:
                    # Extract 3 lines above and below (if they exist)
                    start_idx = max(0, i - 3)
                    end_idx = min(len(lines), i + 4)  # +4 because range is exclusive
                    
                    context_lines = lines[start_idx:end_idx]
                    
                    # Add file info and context to results
                    results.append(f"\n{'='*60}")
                    results.append(f"File: {json_file}")
                    results.append(f"Line {i+1}: Found 'assetPath'")
                    results.append(f"{'='*60}")
                    
                    # Add line numbers and content
                    for j, context_line in enumerate(context_lines):
                        line_num = start_idx + j + 1
                        marker = " >>> " if (start_idx + j) == i else "     "
                        results.append(f"{line_num:4d}{marker}{context_line.rstrip()}")
                    
                    results.append("")  # Empty line for readability
        
        except Exception as e:
            results.append(f"\nError reading {json_file}: {str(e)}\n")
    
    return results

def main():
    """Main function to execute the search and save results."""
    print("Searching for 'assetPath' in JSON files...")
    
    # Check if the assets/jsons directory exists
    if not os.path.exists("assets/jsons"):
        print("Error: assets/jsons directory not found!")
        return
    
    # Find all asset paths
    results = find_asset_paths_in_json_files()
    
    # Write results to output file
    output_file = "asset_paths_output.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("Asset Path Search Results\n")
        f.write("=" * 60 + "\n")
        f.write(f"Search completed on: {Path.cwd()}\n")
        f.write(f"Total matches found: {len([r for r in results if 'Found \'assetPath\'' in r])}\n")
        f.write("\n")
        
        for result in results:
            f.write(result + "\n")
    
    print(f"Search completed! Results saved to: {output_file}")
    print(f"Total matches found: {len([r for r in results if 'Found \'assetPath\'' in r])}")

if __name__ == "__main__":
    main() 