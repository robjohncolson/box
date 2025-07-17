#!/usr/bin/env python3
"""
Script to extract unique technical statistics terms from JSON files.
Processes files in assets/jsons/ directory and subdirectories one at a time.
Outputs a deduplicated, sorted list of technical terms to wordlist.json.
"""

import os
import json
import re
from pathlib import Path

def get_stopwords():
    """
    Returns a comprehensive list of common English words and non-statistical terms
    to filter out from the technical vocabulary extraction.
    """
    return {
        # Basic English stopwords
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 
        'after', 'above', 'below', 'between', 'among', 'under', 'over', 'out',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
        'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'some', 'any',
        'all', 'each', 'every', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
        'too', 'very', 'just', 'now', 'here', 'there', 'where', 'when', 'why',
        'how', 'what', 'which', 'who', 'whom', 'whose', 'if', 'then', 'else',
        'as', 'like', 'such', 'both', 'either', 'neither', 'more', 'most',
        'much', 'many', 'few', 'little', 'less', 'least', 'first', 'last',
        'next', 'previous', 'new', 'old', 'good', 'bad', 'big', 'small',
        'long', 'short', 'high', 'low', 'right', 'left', 'true', 'false',
        
        # Common non-statistical terms
        'following', 'given', 'question', 'answer', 'problem', 'solution',
        'example', 'case', 'part', 'section', 'chapter', 'page', 'line',
        'word', 'text', 'number', 'value', 'result', 'option', 'choice',
        'correct', 'incorrect', 'best', 'worst', 'find', 'calculate',
        'determine', 'identify', 'select', 'choose', 'explain', 'describe',
        'show', 'prove', 'assume', 'suppose', 'consider', 'think', 'know',
        'understand', 'remember', 'forget', 'learn', 'study', 'read', 'write',
        'look', 'see', 'watch', 'listen', 'hear', 'speak', 'tell', 'say',
        'ask', 'answer', 'help', 'work', 'play', 'make', 'take', 'give',
        'get', 'put', 'go', 'come', 'want', 'need', 'like', 'love', 'hate',
        'feel', 'seem', 'appear', 'become', 'remain', 'stay', 'keep', 'let',
        'allow', 'permit', 'prevent', 'stop', 'start', 'begin', 'end', 'finish',
        'continue', 'proceed', 'return', 'turn', 'move', 'change', 'improve',
        'increase', 'decrease', 'reduce', 'add', 'subtract', 'multiply', 'divide',
        'equal', 'different', 'similar', 'same', 'other', 'another', 'else',
        'also', 'too', 'again', 'once', 'twice', 'never', 'always', 'often',
        'sometimes', 'usually', 'rarely', 'seldom', 'hardly', 'almost', 'quite',
        'rather', 'pretty', 'fairly', 'really', 'actually', 'certainly',
        'probably', 'possibly', 'maybe', 'perhaps', 'surely', 'definitely'
    }

def is_stats_flavored(word):
    """
    Check if a word has statistics-flavored characteristics.
    Prioritizes words with statistical suffixes or containing statistical roots.
    """
    # Statistical suffixes
    stats_suffixes = ['tion', 'sion', 'ism', 'ance', 'ence', 'ity', 'ment', 'ness']
    
    # Statistical roots/fragments
    stats_roots = ['dist', 'var', 'prob', 'conf', 'samp', 'stat', 'test', 'corr', 
                   'regr', 'norm', 'binom', 'poiss', 'expo', 'chi', 'anova', 
                   'hypo', 'null', 'alter', 'sign', 'level', 'crit', 'reject']
    
    # Check for statistical suffixes
    for suffix in stats_suffixes:
        if word.endswith(suffix):
            return True
    
    # Check for statistical roots
    for root in stats_roots:
        if root in word:
            return True
    
    return False

def extract_text_from_json(data, target_fields=None):
    """
    Recursively extract text from specified fields in JSON data.
    Default fields: prompt, choices, reasoning, solution, explanation, content
    """
    if target_fields is None:
        target_fields = {'prompt', 'choices', 'reasoning', 'solution', 'explanation', 'content'}
    
    extracted_text = []
    
    def recursive_extract(obj, current_path=""):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in target_fields and isinstance(value, str):
                    extracted_text.append(value)
                elif key == 'attachments' and isinstance(value, dict):
                    # Special handling for attachments.choices (values only)
                    if 'choices' in value and isinstance(value['choices'], dict):
                        for choice_value in value['choices'].values():
                            if isinstance(choice_value, str):
                                extracted_text.append(choice_value)
                    else:
                        recursive_extract(value, f"{current_path}.{key}")
                else:
                    recursive_extract(value, f"{current_path}.{key}")
        elif isinstance(obj, list):
            for item in obj:
                recursive_extract(item, current_path)
        elif isinstance(obj, str) and current_path.split('.')[-1] in target_fields:
            extracted_text.append(obj)
    
    recursive_extract(data)
    return extracted_text

def tokenize_and_filter(text_list, stopwords):
    """
    Tokenize text into words and filter for technical terms.
    """
    # Regex pattern for words with 4+ letters, lowercase only
    word_pattern = re.compile(r'\b[a-z]{4,}\b')
    
    unique_words = set()
    
    for text in text_list:
        if not isinstance(text, str):
            continue
            
        # Convert to lowercase and extract words
        words = word_pattern.findall(text.lower())
        
        for word in words:
            # Skip stopwords
            if word in stopwords:
                continue
            
            # Add word to set (automatically deduplicates)
            unique_words.add(word)
    
    return unique_words

def process_json_file(file_path, stopwords):
    """
    Process a single JSON file and extract technical terms.
    Returns a set of unique technical terms from this file.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract text from relevant fields
        text_list = extract_text_from_json(data)
        
        # Tokenize and filter
        words = tokenize_and_filter(text_list, stopwords)
        
        print(f"Processed {file_path}: found {len(words)} unique terms")
        return words
        
    except json.JSONDecodeError as e:
        print(f"Error: Malformed JSON in {file_path}: {e}")
        return set()
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return set()

def extract_stats_terms(base_dir="assets/jsons"):
    """
    Main function to extract technical statistics terms from all JSON files.
    """
    print(f"Starting extraction from directory: {base_dir}")
    
    # Check if directory exists
    if not os.path.exists(base_dir):
        print(f"Error: Directory {base_dir} not found!")
        return
    
    # Get stopwords
    stopwords = get_stopwords()
    print(f"Using {len(stopwords)} stopwords for filtering")
    
    # Set to store all unique terms across all files
    all_terms = set()
    
    # Walk through directory recursively
    json_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.json'):
                json_files.append(os.path.join(root, file))
    
    print(f"Found {len(json_files)} JSON files to process")
    
    # Process each file one at a time
    for i, json_file in enumerate(json_files, 1):
        print(f"Processing file {i}/{len(json_files)}: {json_file}")
        
        # Extract terms from this file
        file_terms = process_json_file(json_file, stopwords)
        
        # Add to global set (automatic deduplication)
        all_terms.update(file_terms)
    
    # Filter to only include stats-flavored terms
    print(f"\nTotal unique terms found: {len(all_terms)}")
    
    # Filter for stats-flavored terms only
    stats_terms = []
    
    for term in all_terms:
        if is_stats_flavored(term):
            stats_terms.append(term)
    
    # Sort alphabetically
    stats_terms.sort()
    
    # Use only stats-flavored terms
    final_terms = stats_terms
    
    print(f"Stats-flavored terms: {len(stats_terms)}")
    print(f"Regular terms filtered out: {len(all_terms) - len(stats_terms)}")
    
    # Output to JSON file
    output_file = "wordlist.json"
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_terms, f, indent=2, ensure_ascii=False)
        
        print(f"\nSuccess! Wordlist saved to: {output_file}")
        print(f"Total terms in wordlist: {len(final_terms)}")
        
        # Show first 10 terms as preview
        if final_terms:
            print(f"\nFirst 10 terms: {final_terms[:10]}")
            
    except Exception as e:
        print(f"Error writing output file: {e}")

def main():
    """Main entry point."""
    print("Technical Statistics Terms Extractor")
    print("=" * 50)
    
    # Run the extraction
    extract_stats_terms()

if __name__ == "__main__":
    main() 