#!/usr/bin/env python3
"""
DVC Diff Script

This script performs the same action as 'dvc diff --json' using the DVC Python API
instead of the command line interface.

Usage:
    python dvc_diff_script.py [a_rev] [b_rev] [--targets file1 file2 ...]

Examples:
    python dvc_diff_script.py
    python dvc_diff_script.py HEAD
    python dvc_diff_script.py HEAD workspace
    python dvc_diff_script.py HEAD workspace --targets data.csv model.pkl
    python dvc_diff_script.py v1.0 v2.0 --targets data/
"""

import argparse
import json
import sys
from typing import List, Optional, Dict, Any

from dvc.repo import Repo
from dvc.exceptions import DvcException


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Show DVC diff in JSON format using Python API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "a_rev",
        nargs="?",
        default="HEAD",
        help="Old Git commit to compare (defaults to HEAD)"
    )
    
    parser.add_argument(
        "b_rev",
        nargs="?",
        help="New Git commit to compare (defaults to the current workspace)"
    )
    
    parser.add_argument(
        "--targets",
        nargs="*",
        help="Specific DVC-tracked files to compare. Accepts one or more file paths.",
        metavar="<paths>"
    )
    
    parser.add_argument(
        "--recursive",
        action="store_true",
        default=False,
        help="Recursively expand directories"
    )
    
    parser.add_argument(
        "--repo-path",
        default=".",
        help="Path to the DVC repository (default: current directory)"
    )
    
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=False,
        help="Pretty print JSON output with indentation"
    )
    
    parser.add_argument(
        "--output",
        help="Output file path (default: stdout)",
        metavar="<file>"
    )
    
    return parser.parse_args()


def format_diff_output(diff: Dict[str, List[Dict[str, Any]]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Format the diff output to match the expected JSON structure.
    
    Args:
        diff: Raw diff from DVC repo.diff()
    
    Returns:
        Formatted diff with proper structure
    """
    # Sort entries by path for consistent output
    for key, entries in diff.items():
        entries.sort(
            key=lambda entry: (
                entry["path"]["old"]
                if isinstance(entry["path"], dict)
                else entry["path"]
            )
        )
    
    # Ensure all expected keys exist
    formatted_diff = {
        "added": diff.get("added", []),
        "deleted": diff.get("deleted", []),
        "modified": diff.get("modified", []),
        "renamed": diff.get("renamed", []),
        "not in cache": diff.get("not in cache", [])
    }
    
    return formatted_diff


def main():
    """Main function to execute DVC diff operation."""
    try:
        args = parse_arguments()
    except Exception as e:
        print(f"Error parsing arguments: {e}", file=sys.stderr)
        return 1
    
    try:
        # Initialize DVC repository
        repo = Repo(args.repo_path)
        
        # Check if repository has any commits
        if repo.scm.no_commits:
            result = {
                "added": [],
                "deleted": [],
                "modified": [],
                "renamed": [],
                "not in cache": []
            }
        else:
            # Perform the diff operation
            diff = repo.diff(
                a_rev=args.a_rev,
                b_rev=args.b_rev,
                targets=args.targets,
                recursive=args.recursive
            )
            
            # Format the output
            result = format_diff_output(diff)
        
        # Convert to JSON
        if args.pretty:
            json_output = json.dumps(result, indent=2, sort_keys=True)
        else:
            json_output = json.dumps(result, sort_keys=True)
        
        # Output the result
        if args.output:
            with open(args.output, 'w') as f:
                f.write(json_output)
            print(f"Diff output written to {args.output}")
        else:
            print(json_output)
        
        return 0
        
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        return 1
    except DvcException as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main()) 