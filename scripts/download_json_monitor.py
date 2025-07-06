import os
import threading
import time
from pathlib import Path
from typing import List

try:
    from watchdog.observers import Observer  # type: ignore
    from watchdog.events import FileSystemEventHandler  # type: ignore
except ImportError:
    print("The 'watchdog' package is required. Install it with 'pip install watchdog'.")
    raise

# -------- CONFIGURATION --------
# Directory to watch (default is the current user's Downloads folder)
DOWNLOAD_DIR = Path.home() / "Downloads"

# Pre-defined list of target names (without .json extension)
TARGET_NAMES: List[str] = [
    "apstat_u1_l2_quiz",
    "apstat_u1_l3_quiz",
    "apstat_u1_l4_quiz",
    "apstat_u2_l3_quiz",
    "custom_name",
]
# --------------------------------

current_target_lock = threading.Lock()
current_target_index = 0  # Default selection index into TARGET_NAMES

# ----------------- Helper functions for template management -----------------


def _ensure_valid_index():
    """Ensure current_target_index is within bounds of TARGET_NAMES."""
    global current_target_index
    if current_target_index >= len(TARGET_NAMES):
        current_target_index = max(0, len(TARGET_NAMES) - 1)


def add_template(name: str):
    """Add a single template name to TARGET_NAMES if it doesn't already exist."""
    with current_target_lock:
        if name in TARGET_NAMES:
            print(f"[INFO] Template '{name}' already exists.")
            return
        TARGET_NAMES.append(name)
        print(f"[INFO] Added template '{name}'.")
        _ensure_valid_index()


def clear_templates():
    """Remove all template names."""
    with current_target_lock:
        TARGET_NAMES.clear()
    print("[INFO] Cleared all template names. Add new ones with 'add'.")
    _ensure_valid_index()


def expand_template(base: str, max_num: int):
    """Generate a range of templates by incrementing the lesson number.

    Example: base = 'ap_stat_u2_l3_quiz', max_num=9 will add
    ap_stat_u2_l3_quiz, ap_stat_u2_l4_quiz, ... ap_stat_u2_l9_quiz
    """
    import re

    match = re.search(r"(.*_l)(\d+)(_.*)", base)
    if not match:
        print("[WARN] Could not detect lesson number pattern '_l<digit>' in template.")
        return

    prefix, start_str, suffix = match.groups()
    start_num = int(start_str)
    if max_num < start_num:
        print("[WARN] max_num must be greater than or equal to starting lesson number.")
        return

    for num in range(start_num, max_num + 1):
        new_name = f"{prefix}{num}{suffix}"
        add_template(new_name)

# ----------------- End helper functions -----------------


def get_current_target() -> str:
    with current_target_lock:
        return TARGET_NAMES[current_target_index]


def set_current_target(new_index: int):
    global current_target_index
    if 0 <= new_index < len(TARGET_NAMES):
        with current_target_lock:
            current_target_index = new_index
        print(f"[INFO] Switched target to '{TARGET_NAMES[new_index]}.json'")
    else:
        print("[WARN] Invalid index. Use the 'list' command to view valid indices.")


def next_copy_name(base_name: str, directory: Path) -> Path:
    """Return an available Path with prefix 'copyN_' if necessary."""
    candidate = directory / f"{base_name}.json"
    if not candidate.exists():
        return candidate

    counter = 1
    while True:
        candidate = directory / f"copy{counter}_{base_name}.json"
        if not candidate.exists():
            return candidate
        counter += 1


class JsonCreationHandler(FileSystemEventHandler):
    """Handler that renames newly created JSON files."""

    def on_created(self, event):
        # Ignore directories
        if event.is_directory:
            return

        path = Path(str(event.src_path))  # type: ignore[arg-type]
        if path.suffix.lower() != ".json":
            return

        # Wait briefly to ensure the file is fully written
        time.sleep(0.1)

        target_base = get_current_target()
        if not target_base:
            print("[WARN] No target names defined. Use 'add' to add a template.")
            return
        new_path = next_copy_name(target_base, path.parent)

        try:
            os.rename(str(path), str(new_path))  # type: ignore[arg-type]
            print(f"[RENAME] '{path.name}' -> '{new_path.name}'")
        except Exception as e:
            print(f"[ERROR] Failed to rename '{path}': {e}")


def user_input_loop():
    """Thread loop to handle user commands to switch target names."""
    help_text = (
        "Commands:\n"
        "  list               - Show available target names\n"
        "  select <index>     - Switch current target name\n"
        "  add <name>         - Add a new template name\n"
        "  clear              - Remove all template names\n"
        "  expand <name> <N>  - Add templates by incrementing lesson number up to N\n"
        "  current            - Show current selection\n"
        "  help               - Show this help\n"
        "  quit               - Exit program\n"
    )
    print(help_text)

    while True:
        try:
            cmd = input("> ").strip()
        except EOFError:
            break  # End on Ctrl+D (Unix) / Ctrl+Z (Windows)

        if cmd == "list":
            for i, name in enumerate(TARGET_NAMES):
                marker = "<-" if i == current_target_index else "  "
                print(f"  {i}: {name}.json {marker}")
        elif cmd.startswith("select "):
            try:
                idx = int(cmd.split()[1])
                set_current_target(idx)
            except (IndexError, ValueError):
                print("[WARN] Usage: select <index>")
        elif cmd.startswith("add "):
            name = cmd[len("add "):].strip()
            if name:
                add_template(name)
            else:
                print("[WARN] Usage: add <template_name>")
        elif cmd == "clear":
            clear_templates()
        elif cmd.startswith("expand "):
            parts = cmd.split()
            if len(parts) == 3 and parts[2].isdigit():
                template_name = parts[1]
                max_num = int(parts[2])
                expand_template(template_name, max_num)
            else:
                print("[WARN] Usage: expand <template_name> <max_number>")
        elif cmd == "current":
            print(f"Current target: {get_current_target()}.json")
        elif cmd == "help":
            print(help_text)
        elif cmd == "quit":
            print("Exiting...")
            os._exit(0)  # Force exit to stop watchdog threads cleanly
        else:
            print("Unknown command. Type 'help' for options.")


def main():
    if not DOWNLOAD_DIR.exists():
        print(f"[ERROR] Download directory does not exist: {DOWNLOAD_DIR}")
        return

    print(f"Monitoring directory: {DOWNLOAD_DIR}")
    print(f"Initial target: '{get_current_target()}.json'")

    event_handler = JsonCreationHandler()
    observer = Observer()
    observer.schedule(event_handler, str(DOWNLOAD_DIR), recursive=False)
    observer.start()

    # Start the user input thread
    input_thread = threading.Thread(target=user_input_loop, daemon=True)
    input_thread.start()

    try:
        while observer.is_alive():
            observer.join(1)
    except KeyboardInterrupt:
        print("\n[INFO] Stopping observer...")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main() 