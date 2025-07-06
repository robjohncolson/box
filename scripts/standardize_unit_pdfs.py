#!/usr/bin/env python3
"""
PDF Unit Directory Standardizer

Standardizes PDF unit directories to match the "answers-only" pattern from Unit 2.
Removes quiz files while preserving answer files and other non-assessment documents.

Usage:
    python standardize_unit_pdfs.py --reference assets/pdfs/unit2 --target assets/pdfs/unit3 [--dry-run]
    python standardize_unit_pdfs.py --batch assets/pdfs/unit2 assets/pdfs/unit3 assets/pdfs/unit4 [--dry-run]
    python standardize_unit_pdfs.py --reference assets/pdfs/unit2 --target-range 3-9 [--dry-run]
"""

import os
import re
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from datetime import datetime


class PDFStandardizer:
    """Standardizes PDF unit directories based on a reference pattern."""
    
    def __init__(self, reference_dir: Path, dry_run: bool = True):
        self.reference_dir = Path(reference_dir)
        self.dry_run = dry_run
        self.logger = self._setup_logging()
        self.allowed_patterns: Set[str] = set()
        self.actions: Dict[str, List[Tuple[Path, str]]] = {
            'keep': [],
            'delete': [],
            'unknown': []
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = f"standardize_{timestamp}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger(__name__)
    
    def parse_filename(self, filename: str) -> Dict[str, Optional[str]]:
        """
        Parse PDF filename into components.
        
        Returns dict with keys: unit, category, section, part, type, extension
        """
        # Remove extension
        name, ext = os.path.splitext(filename.lower())
        
        # Pattern for section files: unitX_sectionX.Y_type.pdf
        section_pattern = r'unit(\d+)_section(\d+)\.(\d+)_(\w+)'
        section_match = re.match(section_pattern, name)
        if section_match:
            return {
                'unit': section_match.group(1),
                'category': 'section',
                'section': f"{section_match.group(2)}.{section_match.group(3)}",
                'part': None,
                'type': section_match.group(4),
                'extension': ext
            }
        
        # Pattern for PC MCQ: unitX_pc_mcq_partY_type.pdf
        mcq_pattern = r'unit(\d+)_pc_mcq_part([a-z]+)_(\w+)'
        mcq_match = re.match(mcq_pattern, name)
        if mcq_match:
            return {
                'unit': mcq_match.group(1),
                'category': 'pc_mcq',
                'section': None,
                'part': mcq_match.group(2),
                'type': mcq_match.group(3),
                'extension': ext
            }
        
        # Pattern for PC FRQ: unitX_pc_frq_type.pdf or unitX_pc_frq.pdf
        frq_pattern = r'unit(\d+)_pc_frq(?:_(\w+))?'
        frq_match = re.match(frq_pattern, name)
        if frq_match:
            frq_type = frq_match.group(2) if frq_match.group(2) else 'quiz'
            return {
                'unit': frq_match.group(1),
                'category': 'pc_frq',
                'section': None,
                'part': None,
                'type': frq_type,
                'extension': ext
            }
        
        # Unknown pattern
        return {
            'unit': None,
            'category': 'unknown',
            'section': None,
            'part': None,
            'type': None,
            'extension': ext
        }
    
    def normalize_pattern(self, parsed: Dict[str, Optional[str]]) -> str:
        """Convert parsed filename components to normalized pattern."""
        if parsed['category'] == 'section':
            return f"@section{parsed['section']}_{parsed['type']}.pdf"
        elif parsed['category'] == 'pc_mcq':
            return f"@pc_mcq_part{parsed['part']}_{parsed['type']}.pdf"
        elif parsed['category'] == 'pc_frq':
            return f"@pc_frq_{parsed['type']}.pdf"
        else:
            return f"@unknown_{parsed.get('type', 'file')}.pdf"
    
    def build_reference_patterns(self) -> None:
        """Build allowed patterns from reference directory."""
        if not self.reference_dir.exists():
            raise FileNotFoundError(f"Reference directory not found: {self.reference_dir}")
        
        self.logger.info(f"Building reference patterns from: {self.reference_dir}")
        
        for file_path in self.reference_dir.glob("*.pdf"):
            parsed = self.parse_filename(file_path.name)
            if parsed['category'] != 'unknown':
                pattern = self.normalize_pattern(parsed)
                self.allowed_patterns.add(pattern)
                self.logger.debug(f"Added pattern: {pattern} from {file_path.name}")
        
        # Also allow non-PDF files that exist in reference
        for file_path in self.reference_dir.iterdir():
            if file_path.is_file() and not file_path.name.lower().endswith('.pdf'):
                self.allowed_patterns.add(f"@misc_{file_path.name}")
                self.logger.debug(f"Added misc pattern: {file_path.name}")
        
        self.logger.info(f"Built {len(self.allowed_patterns)} reference patterns")
    
    def analyze_target_directory(self, target_dir: Path) -> None:
        """Analyze target directory and categorize files."""
        if not target_dir.exists():
            raise FileNotFoundError(f"Target directory not found: {target_dir}")
        
        self.logger.info(f"Analyzing target directory: {target_dir}")
        
        # Reset actions for this directory
        self.actions = {'keep': [], 'delete': [], 'unknown': []}
        
        for file_path in target_dir.iterdir():
            if file_path.is_file():
                self._categorize_file(file_path)
        
        self.logger.info(f"Analysis complete: {len(self.actions['keep'])} keep, "
                        f"{len(self.actions['delete'])} delete, "
                        f"{len(self.actions['unknown'])} unknown")
    
    def _categorize_file(self, file_path: Path) -> None:
        """Categorize a single file as keep, delete, or unknown."""
        filename = file_path.name
        
        if filename.lower().endswith('.pdf'):
            parsed = self.parse_filename(filename)
            if parsed['category'] != 'unknown':
                pattern = self.normalize_pattern(parsed)
                if pattern in self.allowed_patterns:
                    self.actions['keep'].append((file_path, f"Matches pattern: {pattern}"))
                else:
                    self.actions['delete'].append((file_path, f"No match for pattern: {pattern}"))
            else:
                self.actions['unknown'].append((file_path, "Unknown PDF pattern"))
        else:
            # Non-PDF files
            misc_pattern = f"@misc_{filename}"
            if misc_pattern in self.allowed_patterns:
                self.actions['keep'].append((file_path, f"Matches misc pattern: {filename}"))
            else:
                self.actions['unknown'].append((file_path, f"Unknown non-PDF file: {filename}"))
    
    def print_summary(self, target_dir: Path) -> None:
        """Print summary of planned actions."""
        print(f"\n{'='*60}")
        print(f"STANDARDIZATION SUMMARY: {target_dir}")
        print(f"{'='*60}")
        
        if self.actions['keep']:
            print(f"\n📁 KEEP ({len(self.actions['keep'])} files):")
            for file_path, reason in self.actions['keep']:
                print(f"  ✅ {file_path.name} - {reason}")
        
        if self.actions['delete']:
            print(f"\n🗑️  DELETE ({len(self.actions['delete'])} files):")
            for file_path, reason in self.actions['delete']:
                print(f"  ❌ {file_path.name} - {reason}")
        
        if self.actions['unknown']:
            print(f"\n❓ UNKNOWN ({len(self.actions['unknown'])} files):")
            for file_path, reason in self.actions['unknown']:
                print(f"  ⚠️  {file_path.name} - {reason}")
        
        print(f"\n{'='*60}")
        if self.dry_run:
            print("🔍 DRY RUN - No files will be modified")
        else:
            print("⚠️  LIVE RUN - Files will be deleted!")
        print(f"{'='*60}")
    
    def execute_actions(self, target_dir: Path) -> None:
        """Execute the planned actions."""
        if self.dry_run:
            self.logger.info("Dry run mode - no files will be modified")
            return
        
        deleted_count = 0
        for file_path, reason in self.actions['delete']:
            try:
                file_path.unlink()
                self.logger.info(f"Deleted: {file_path} - {reason}")
                deleted_count += 1
            except Exception as e:
                self.logger.error(f"Failed to delete {file_path}: {e}")
        
        self.logger.info(f"Successfully deleted {deleted_count} files from {target_dir}")
    
    def standardize_directory(self, target_dir: Path) -> None:
        """Complete standardization process for a single directory."""
        self.logger.info(f"Starting standardization of: {target_dir}")
        
        self.analyze_target_directory(target_dir)
        self.print_summary(target_dir)
        
        if not self.dry_run:
            response = input("\nProceed with deletion? (y/N): ")
            if response.lower() != 'y':
                self.logger.info("Standardization cancelled by user")
                return
        
        self.execute_actions(target_dir)
        self.logger.info(f"Standardization complete: {target_dir}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Standardize PDF unit directories based on reference pattern",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Standardize single unit (dry run)
  python standardize_unit_pdfs.py --reference assets/pdfs/unit2 --target assets/pdfs/unit3

  # Standardize multiple units with force
  python standardize_unit_pdfs.py --reference assets/pdfs/unit2 --target assets/pdfs/unit3 assets/pdfs/unit4 --force

  # Standardize range of units
  python standardize_unit_pdfs.py --reference assets/pdfs/unit2 --target-range 3-9 --force
        """
    )
    
    parser.add_argument('--reference', type=Path, required=True,
                       help='Reference directory (e.g., assets/pdfs/unit2)')
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--target', type=Path, nargs='+',
                      help='Target directory(ies) to standardize')
    group.add_argument('--target-range', type=str,
                      help='Range of units to standardize (e.g., "3-9")')
    
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Show what would be done without making changes (default)')
    parser.add_argument('--force', action='store_true',
                       help='Actually perform the standardization')
    
    args = parser.parse_args()
    
    # Determine dry run mode
    dry_run = not args.force
    
    # Initialize standardizer
    standardizer = PDFStandardizer(args.reference, dry_run=dry_run)
    
    try:
        # Build reference patterns
        standardizer.build_reference_patterns()
        
        # Determine target directories
        target_dirs = []
        if args.target:
            target_dirs = args.target
        elif args.target_range:
            # Parse range like "3-9"
            start, end = map(int, args.target_range.split('-'))
            base_dir = args.reference.parent
            target_dirs = [base_dir / f"unit{i}" for i in range(start, end + 1)]
        
        # Process each target directory
        for target_dir in target_dirs:
            if target_dir.exists():
                standardizer.standardize_directory(target_dir)
            else:
                print(f"⚠️  Skipping non-existent directory: {target_dir}")
        
        print(f"\n✅ Standardization complete! Check the log file for details.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main()) 