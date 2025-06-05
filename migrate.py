#!/usr/bin/env python3
import os
import re
import sys
import difflib

# Mapping from v3 to v4
REPLACEMENTS = [
    ("shadow-sm", "shadow-xs"),
    ("blur-sm", "blur-xs"),
    ("backdrop-blur-sm", "backdrop-blur-xs"),
    ("rounded-sm", "rounded-xs"),
    ("outline-none", "outline-hidden"),
    ("ring", "ring-3"),
    ("shadow", "shadow-sm"),
    ("drop-shadow-sm", "drop-shadow-xs"),
    ("drop-shadow", "drop-shadow-sm"),
    ("rounded", "rounded-sm"),
    ("backdrop-blur", "backdrop-blur-sm"),
    ("blur", "blur-sm"),
]
REPLACEMENTS2 = [
]

# File extensions to scan
EXTENSIONS = {".js", ".ts", ".vue", ".jsx", ".tsx", ".html", ".css", ".scss", ".md", ".json", ".yml", ".yaml", ".txt"}

def replace_classes(text):
    for old, new in REPLACEMENTS:
        # Only match if not followed by ( or . (to avoid function/prop calls)
        pattern = (
            rf'(?<![\w-])'           # Not preceded by word char or dash
            rf'({re.escape(old)})'   # The class name
            rf'(?![\w-]|[\(\.])'     # Not followed by word char, dash, ( or .
        )
        text = re.sub(pattern, new, text)
    return text

def process_file(path, dry_run=False):
    try:
        with open(path, "r", encoding="utf-8") as f:
            original = f.read()
    except UnicodeDecodeError:
        print(f"Skipped (not UTF-8): {path}")
        return
    replaced = replace_classes(original)
    if replaced != original:
        if dry_run:
            print(f"Would update: {path}")
            diff = difflib.unified_diff(
                original.splitlines(keepends=True),
                replaced.splitlines(keepends=True),
                fromfile=f"{path} (original)",
                tofile=f"{path} (replaced)",
            )
            print("".join(diff))
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(replaced)
            print(f"Updated: {path}")

def main(root_dir, dry_run=False):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Remove node_modules from the list of directories to walk into
        dirnames[:] = [d for d in dirnames if d != "node_modules"]
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if ext in EXTENSIONS:
                process_file(os.path.join(dirpath, filename), dry_run=dry_run)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate.py <directory> [--dry-run]")
        sys.exit(1)
    dry_run = "--dry-run" in sys.argv
    root_dir = sys.argv[1]
    main(root_dir, dry_run=dry_run)
