#!/bin/bash

# Script to rename AP Statistics lesson files with zero-padded lesson numbers
# This script renames files like:
# - ap_stats_u1_l2_quiz.json -> ap_stats_u1_l02_quiz.json
# - ap_stats_u1_l10_quiz.json -> ap_stats_u1_l10_quiz.json (already 2 digits)

BASE_DIR="assets/jsons"

# Function to preview changes
preview_changes() {
    echo "PREVIEW MODE - No files will be renamed"
    echo "=================================================="
    
    local total_to_rename=0
    
    for unit_dir in "$BASE_DIR"/Unit*; do
        if [[ -d "$unit_dir" ]]; then
            local unit_name=$(basename "$unit_dir")
            echo ""
            echo "$unit_name:"
            
            local to_rename_in_unit=0
            
            for file in "$unit_dir"/*.json; do
                if [[ -f "$file" ]]; then
                    local filename=$(basename "$file")
                    
                    # Check if it's a lesson file with single digit lesson number
                    if [[ $filename =~ ^(ap_stats_u[0-9]+_l)([0-9])(_.*\.json)$ ]]; then
                        local prefix="${BASH_REMATCH[1]}"
                        local lesson_num="${BASH_REMATCH[2]}"
                        local suffix="${BASH_REMATCH[3]}"
                        
                        local new_filename="${prefix}0${lesson_num}${suffix}"
                        echo "  $filename -> $new_filename"
                        ((to_rename_in_unit++))
                        ((total_to_rename++))
                    fi
                fi
            done
            
            if [[ $to_rename_in_unit -eq 0 ]]; then
                echo "  No files to rename in this unit"
            fi
        fi
    done
    
    echo ""
    echo "Total files that would be renamed: $total_to_rename"
}

# Function to rename files
rename_files() {
    echo "AP Statistics Lesson File Renamer"
    echo "========================================"
    
    local total_renamed=0
    
    for unit_dir in "$BASE_DIR"/Unit*; do
        if [[ -d "$unit_dir" ]]; then
            local unit_name=$(basename "$unit_dir")
            echo ""
            echo "Processing $unit_name..."
            
            local renamed_in_unit=0
            
            for file in "$unit_dir"/*.json; do
                if [[ -f "$file" ]]; then
                    local filename=$(basename "$file")
                    
                    # Check if it's a lesson file with single digit lesson number
                    if [[ $filename =~ ^(ap_stats_u[0-9]+_l)([0-9])(_.*\.json)$ ]]; then
                        local prefix="${BASH_REMATCH[1]}"
                        local lesson_num="${BASH_REMATCH[2]}"
                        local suffix="${BASH_REMATCH[3]}"
                        
                        local new_filename="${prefix}0${lesson_num}${suffix}"
                        local new_filepath="$unit_dir/$new_filename"
                        
                        echo "  Renaming: $filename -> $new_filename"
                        
                        if mv "$file" "$new_filepath" 2>/dev/null; then
                            ((renamed_in_unit++))
                            ((total_renamed++))
                        else
                            echo "  Error renaming $filename"
                        fi
                    elif [[ $filename =~ ^ap_stats_u[0-9]+_l[0-9]{2,}_.*\.json$ ]]; then
                        echo "  Skipping $filename (already multi-digit lesson number)"
                    elif [[ $filename =~ _pc_ ]]; then
                        echo "  Skipping progress check file: $filename"
                    else
                        echo "  Skipping non-lesson file: $filename"
                    fi
                fi
            done
            
            echo "  Renamed $renamed_in_unit files in $unit_name"
        fi
    done
    
    echo ""
    echo "Total files renamed: $total_renamed"
}

# Main script
if [[ ! -d "$BASE_DIR" ]]; then
    echo "Error: Directory $BASE_DIR not found!"
    exit 1
fi

if [[ "$1" == "--preview" ]]; then
    preview_changes
else
    # Show preview first
    preview_changes
    echo ""
    echo "=================================================="
    read -p "Do you want to proceed with renaming? (y/N): " response
    
    case "$response" in
        [yY]|[yY][eE][sS])
            rename_files
            ;;
        *)
            echo "Renaming cancelled."
            ;;
    esac
fi 