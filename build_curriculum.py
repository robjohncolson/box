from pathlib import Path
import json
import sys

def find_project_root_and_assets():
    """
    Searches upward for the 'assets/jsons/' starting from the script's directory, up to 4 levels.
    Returns (project_root, assets_dir) or (None, None) if not found.
    """
    script_dir = Path(__file__).resolve().parent
    current = script_dir
    for _ in range(4):
        assets_dir = current / 'assets' / 'jsons'
        if assets_dir.is_dir():
            return current, assets_dir
        current = current.parent
    return None, None

def remove_comments(text):
    """
    Removes JavaScript-style comments from the text, respecting string literals.
    Handles // and /* */ comments, single and double quotes, and escapes.
    Preserves newlines for line comments.
    """
    result = []
    i = 0
    length = len(text)
    state = 'NORMAL'
    string_char = None
    escape = False
    while i < length:
        char = text[i]
        if state == 'NORMAL':
            if i + 1 < length and text[i:i+2] == '//':
                state = 'LINE_COMMENT'
                i += 2
                continue
            elif text[i:i+2] == '/*':
                state = 'BLOCK_COMMENT'
                i += 2
                continue
            elif char in ('"', "'"):
                result.append(char)
                state = 'STRING'
                string_char = char
                escape = False
                i += 1
                continue
            else:
                result.append(char)
                i += 1
        elif state == 'STRING':
            result.append(char)
            i += 1
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == string_char and not escape:
                state = 'NORMAL'
                escape = False
        elif state == 'LINE_COMMENT':
            i += 1
            if char == '\n':
                state = 'NORMAL'
                result.append('\n')
        elif state == 'BLOCK_COMMENT':
            i += 1
            if i < length and text[i-1] == '*' and text[i] == '/':
                state = 'NORMAL'
                i += 1  # skip the /
    return ''.join(result)

def extract_json_blocks(clean_text):
    """
    Extracts individual JSON object strings from the clean text using brace-counting,
    respecting string literals and escapes.
    """
    blocks = []
    current_block = ""
    brace_count = 0
    in_string = False
    string_char = None
    escape = False
    # will_toggle = False  # Indicates if we should toggle in_string state for this char

    for char in clean_text:
        # Reset toggle
        will_toggle = False

        if in_string:
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == string_char:
                will_toggle = True
        else:
            if char in ('"', "'"):
                string_char = char
                will_toggle = True

        if will_toggle:
            in_string = not in_string

        # Now process for block extraction
        if not in_string:
            if char == '{':
                if brace_count == 0:
                    current_block = '{'
                else:
                    current_block += char
                brace_count += 1
            elif char == '}':
                current_block += char
                brace_count -= 1
                if brace_count == 0:
                    blocks.append(current_block)
                    current_block = ""
            elif brace_count > 0:
                current_block += char
        else:
            if brace_count > 0:
                current_block += char

    # If brace_count > 0 at end, incomplete, log but ignore for now
    if brace_count > 0:
        print(f"Warning: Incomplete JSON block found (unmatched braces: {brace_count}). Discarding.")
    return blocks

def main():
    print("Searching for assets/jsons/ directory...")

    project_root, assets_dir = find_project_root_and_assets()
    if not assets_dir:
        print("""ERROR: Could not find the 'assets/jsons/' directory.
Please ensure you are running this script from within the project directory,
and that the 'assets/jsons/' structure exists.
Script aborted.""")
        sys.exit(1)

    print(f"Found 'assets/jsons/' at {assets_dir}'")

    # Collect all .json files
    json_files = sorted(assets_dir.rglob('*.json'))

    questions = []
    seen_ids = {}  # id to first filename

    for file_path in json_files:
        filename = file_path.relative_to(assets_dir).as_posix()
        print(f"Processing file: {filename}...")

        try:
            text = file_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Warning: Failed to read file '{filename}': {str(e)}")
            continue

        # Remove comments
        clean_text = remove_comments(text)

        # Extract blocks
        blocks = extract_json_blocks(clean_text)

        valid_count = 0

        for block in blocks:
            try:
                data = json.loads(block)
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to parse JSON object in '{filename}': {str(e)}")
                print(f"Problematic text: {block[:100]}...")
                continue

            if not isinstance(data, dict) or 'id' not in data or not data['id'] or 'type' not in data or not data['type']:
                print(f"Warning: Skipping invalid object (missing or empty 'id' or 'type') in '{filename}': {block[:100]}...")
                continue

            id_ = data['id']
            if id_ in seen_ids:
                first_file = seen_ids[id_]
                print(f"Warning: Duplicate ID '{id_}' found in '{filename}'. Keeping the one from '{seen_ids[id_]}'.")
                continue

            seen_ids[id_] = filename
            questions.append(data)
            valid_count += 1

        print(f"Found {valid_count} valid questions in '{filename}'")

    output_path = project_root / 'pok_curriculum.js'

    if not questions:
        print("""WARNING: Processing complete, but no valid questions were found.
The output file 'pok_curriculum.js' has been created with an empty array.
Please check that your 'assets/jsons/' directory contains valid .json files.
""")

    # Write the output
    js_content = "const POK_CURRICULUM = " + json.dumps(questions, indent=2, ensure_ascii=False) + ";\n"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"Total unique questions found: {len(questions)}")
    print(f"Output written to: {output_path.absolute()}")

    sys.exit(0)

if __name__ == '__main__':
    main()