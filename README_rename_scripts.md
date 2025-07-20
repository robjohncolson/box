# AP Statistics Lesson File Renamer

This repository contains two scripts to rename AP Statistics lesson files with zero-padded lesson numbers for proper alphabetical sorting.

## Problem

Files like `ap_stats_u1_l10_quiz.json` get sorted before `ap_stats_u1_l2_quiz.json` due to alphabetical ordering, which places lesson 10 before lesson 2.

## Solution

These scripts rename single-digit lesson numbers to have leading zeros:
- `ap_stats_u1_l2_quiz.json` → `ap_stats_u1_l02_quiz.json`
- `ap_stats_u1_l3_quiz.json` → `ap_stats_u1_l03_quiz.json`
- ...
- `ap_stats_u1_l9_quiz.json` → `ap_stats_u1_l09_quiz.json`
- `ap_stats_u1_l10_quiz.json` → (unchanged, already 2 digits)

This ensures proper sorting: l02, l03, l04, ..., l09, l10, pc (progress check)

## Available Scripts

### Python Script: `rename_lesson_files.py`

**Preview mode (recommended first):**
```bash
python rename_lesson_files.py --preview
```

**Interactive mode (shows preview, asks for confirmation):**
```bash
python rename_lesson_files.py
```

### Bash Script: `rename_lesson_files.sh`

**Preview mode (recommended first):**
```bash
./rename_lesson_files.sh --preview
```

**Interactive mode (shows preview, asks for confirmation):**
```bash
./rename_lesson_files.sh
```

## What Gets Renamed

- ✅ Lesson files with single-digit numbers: `ap_stats_u*_l[2-9]_*.json`
- ❌ Progress check files: `ap_stats_u*_pc_*.json` (skipped)
- ❌ Files with already multi-digit lesson numbers: `ap_stats_u*_l10_*.json` (skipped)

## Safety Features

1. **Preview mode**: See exactly what changes will be made before proceeding
2. **Interactive confirmation**: Scripts ask for confirmation before making changes
3. **Error handling**: Scripts report any files that couldn't be renamed
4. **Selective renaming**: Only renames files that match the expected pattern

## Example Output

```
PREVIEW MODE - No files will be renamed
==================================================

Unit1:
  ap_stats_u1_l2_quiz.json -> ap_stats_u1_l02_quiz.json
  ap_stats_u1_l3_quiz.json -> ap_stats_u1_l03_quiz.json
  ap_stats_u1_l4_quiz.json -> ap_stats_u1_l04_quiz.json
  ...

Total files that would be renamed: 62
```

## Requirements

- **Python script**: Python 3.x
- **Bash script**: Bash shell (Git Bash on Windows works fine)
- Both scripts work from the project root directory and process all units automatically

## Directory Structure

The scripts expect this structure:
```
assets/jsons/
├── Unit1/
│   ├── ap_stats_u1_l2_quiz.json
│   ├── ap_stats_u1_l3_quiz.json
│   └── ...
├── Unit2/
│   └── ...
└── Unit9/
    └── ...
``` 