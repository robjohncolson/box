#!/usr/bin/env python3
"""
Script to format statswords.txt into a JSON array similar to wordlist.json.
Reads the text file, extracts terms, and outputs them as a properly formatted JSON array.
"""

import json
import re

def extract_and_format_stats_words(input_file="statswords.txt", output_file="formatted_statswords.json"):
    """
    Read statswords.txt and format it as a JSON array.
    """
    print(f"Reading from: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split into lines and clean up
        lines = content.strip().split('\n')
        
        # Extract words (skip empty lines and the header)
        words = []
        for line in lines:
            line = line.strip()
            # Skip empty lines and lines that look like headers/descriptions
            if line and not line.startswith("Based on") and not line.endswith(":"):
                words.append(line)
        
        # Remove duplicates while preserving order
        unique_words = []
        seen = set()
        for word in words:
            if word not in seen:
                unique_words.append(word)
                seen.add(word)
        
        # Sort alphabetically
        unique_words.sort()
        
        print(f"Found {len(unique_words)} unique statistical terms")
        
        # Write to JSON file with same formatting as wordlist.json
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(unique_words, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully formatted and saved to: {output_file}")
        
        # Show first 10 terms as preview
        if unique_words:
            print(f"\nFirst 10 terms: {unique_words[:10]}")
        
        return unique_words
        
    except FileNotFoundError:
        print(f"Error: File {input_file} not found!")
        return None
    except Exception as e:
        print(f"Error processing file: {e}")
        return None

def main():
    """Main entry point."""
    print("Stats Words Formatter")
    print("=" * 30)
    
    # Format the statswords.txt file
    extract_and_format_stats_words()

if __name__ == "__main__":
    main() 