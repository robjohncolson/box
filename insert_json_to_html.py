#!/usr/bin/env python3
"""
Script to insert JSON file contents into HTML files at specific locations.
Replaces the content after "const POK_CURRICULUM = " and "const POK_WORDLIST = "
with the contents of the respective JSON files.
"""

import json
import re
import argparse
import sys
from pathlib import Path


def load_json_file(json_path):
    """Load and return the contents of a JSON file."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: JSON file '{json_path}' not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{json_path}': {e}")
        sys.exit(1)


def read_html_file(html_path):
    """Read and return the contents of an HTML file."""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: HTML file '{html_path}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading HTML file '{html_path}': {e}")
        sys.exit(1)


def write_html_file(html_path, content):
    """Write content to an HTML file."""
    try:
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully updated '{html_path}'")
    except Exception as e:
        print(f"Error writing to HTML file '{html_path}': {e}")
        sys.exit(1)


def insert_json_into_html(html_content, curriculum_data, wordlist_data):
    """
    Insert JSON data into HTML content at the specified locations.
    
    Args:
        html_content (str): The HTML file content
        curriculum_data: The curriculum JSON data
        wordlist_data: The wordlist JSON data
    
    Returns:
        str: Modified HTML content
    """
    # Convert JSON data to JavaScript format
    curriculum_js = json.dumps(curriculum_data, indent=2)
    wordlist_js = json.dumps(wordlist_data, indent=2)
    
    # Pattern to match "const POK_CURRICULUM = " followed by any content until the next semicolon
    curriculum_pattern = r'(const POK_CURRICULUM\s*=\s*)[^;]*;'
    wordlist_pattern = r'(const POK_WORDLIST\s*=\s*)[^;]*;'
    
    # Use a replacement function to avoid regex escape issues
    def curriculum_replacer(match):
        return match.group(1) + curriculum_js + ';'
    
    def wordlist_replacer(match):
        return match.group(1) + wordlist_js + ';'
    
    # Apply replacements using replacement functions
    modified_content = re.sub(curriculum_pattern, curriculum_replacer, html_content, flags=re.DOTALL)
    modified_content = re.sub(wordlist_pattern, wordlist_replacer, modified_content, flags=re.DOTALL)
    
    return modified_content


def main():
    """Main function to handle command line arguments and execute the script."""
    parser = argparse.ArgumentParser(
        description='Insert JSON file contents into HTML files at specific locations'
    )
    parser.add_argument(
        'html_file',
        help='Path to the HTML file to modify'
    )
    parser.add_argument(
        '--curriculum',
        default='pok_curriculum.json',
        help='Path to the curriculum JSON file (default: pok_curriculum.json)'
    )
    parser.add_argument(
        '--wordlist',
        default='wordlist.json',
        help='Path to the wordlist JSON file (default: wordlist.json)'
    )
    parser.add_argument(
        '--backup',
        action='store_true',
        help='Create a backup of the original HTML file before modifying'
    )
    
    args = parser.parse_args()
    
    # Validate file paths
    html_path = Path(args.html_file)
    curriculum_path = Path(args.curriculum)
    wordlist_path = Path(args.wordlist)
    
    if not html_path.exists():
        print(f"Error: HTML file '{html_path}' does not exist.")
        sys.exit(1)
    
    if not curriculum_path.exists():
        print(f"Error: Curriculum JSON file '{curriculum_path}' does not exist.")
        sys.exit(1)
    
    if not wordlist_path.exists():
        print(f"Error: Wordlist JSON file '{wordlist_path}' does not exist.")
        sys.exit(1)
    
    # Create backup if requested
    if args.backup:
        backup_path = html_path.with_suffix(html_path.suffix + '.backup')
        try:
            backup_path.write_text(html_path.read_text(encoding='utf-8'), encoding='utf-8')
            print(f"Backup created: '{backup_path}'")
        except Exception as e:
            print(f"Warning: Could not create backup: {e}")
    
    # Load JSON data
    print(f"Loading curriculum data from '{curriculum_path}'...")
    curriculum_data = load_json_file(curriculum_path)
    
    print(f"Loading wordlist data from '{wordlist_path}'...")
    wordlist_data = load_json_file(wordlist_path)
    
    # Read HTML file
    print(f"Reading HTML file '{html_path}'...")
    html_content = read_html_file(html_path)
    
    # Check if the required constants exist in the HTML
    if 'const POK_CURRICULUM' not in html_content:
        print("Warning: 'const POK_CURRICULUM' not found in HTML file.")
    
    if 'const POK_WORDLIST' not in html_content:
        print("Warning: 'const POK_WORDLIST' not found in HTML file.")
    
    # Insert JSON data into HTML
    print("Inserting JSON data into HTML...")
    modified_html = insert_json_into_html(html_content, curriculum_data, wordlist_data)
    
    # Write modified HTML back to file
    write_html_file(html_path, modified_html)
    
    print("Operation completed successfully!")


if __name__ == '__main__':
    main() 