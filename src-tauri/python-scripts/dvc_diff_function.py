#!/usr/bin/env python3
"""
DVC Diff Function Module

This module provides a simple function to get DVC diff in JSON format
using the DVC Python API instead of the command line interface.

Usage as module:
    from dvc_diff_function import get_dvc_diff
    
    # Get diff between HEAD and workspace
    diff = get_dvc_diff()
    
    # Get diff between specific commits
    diff = get_dvc_diff("v1.0", "v2.0")
    
    # Get diff for specific targets
    diff = get_dvc_diff("HEAD", "workspace", targets=["data.csv", "model.pkl"])
"""

import json
import sys
from typing import List, Optional, Dict, Any, Union

from dvc.repo import Repo
from dvc.exceptions import DvcException


def get_dvc_diff(
    a_rev: str = "HEAD",
    b_rev: Optional[str] = None,
    targets: Optional[List[str]] = None,
    recursive: bool = False,
    repo_path: str = ".",
    verbose: bool = True
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get DVC diff in JSON format using the Python API.
    
    Args:
        a_rev: Old Git commit to compare (defaults to HEAD)
        b_rev: New Git commit to compare (defaults to workspace)
        targets: Specific DVC-tracked files to compare
        recursive: Recursively expand directories
        repo_path: Path to the DVC repository (default: current directory)
        verbose: Print status messages
    
    Returns:
        Dictionary with diff information in the format:
        {
            "added": [{"path": "file.txt", "hash": "abc123"}],
            "deleted": [{"path": "old.txt", "hash": "def456"}],
            "modified": [{"path": "changed.txt", "hash": {"old": "abc123", "new": "def456"}}],
            "renamed": [{"path": {"old": "old.txt", "new": "new.txt"}, "hash": "abc123"}],
            "not in cache": [{"path": "missing.txt", "hash": "abc123"}]
        }
    
    Raises:
        DvcException: If DVC operation fails
        FileNotFoundError: If target files don't exist
    """
    if verbose:
        print(f"Getting DVC diff between {a_rev} and {b_rev or 'workspace'}...")
    
    # Initialize DVC repository
    repo = Repo(repo_path)
    
    # Check if repository has any commits
    if repo.scm.no_commits:
        if verbose:
            print("No commits found in repository")
        return {
            "added": [],
            "deleted": [],
            "modified": [],
            "renamed": [],
            "not in cache": []
        }
    
    # Perform the diff operation
    diff = repo.diff(
        a_rev=a_rev,
        b_rev=b_rev,
        targets=targets,
        recursive=recursive
    )
    
    # Format the output
    result = format_diff_output(diff)
    
    if verbose:
        total_changes = sum(len(entries) for entries in result.values())
        print(f"Found {total_changes} changes")
    
    return result


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


def save_diff_to_file(
    diff: Dict[str, List[Dict[str, Any]]],
    output_path: str,
    pretty: bool = True
) -> None:
    """
    Save diff output to a JSON file.
    
    Args:
        diff: Diff dictionary from get_dvc_diff()
        output_path: Path to save the JSON file
        pretty: Whether to pretty print the JSON
    """
    if pretty:
        json_output = json.dumps(diff, indent=2, sort_keys=True)
    else:
        json_output = json.dumps(diff, sort_keys=True)
    
    with open(output_path, 'w') as f:
        f.write(json_output)


def print_diff_summary(diff: Dict[str, List[Dict[str, Any]]]) -> None:
    """
    Print a summary of the diff.
    
    Args:
        diff: Diff dictionary from get_dvc_diff()
    """
    print("DVC Diff Summary:")
    print("=" * 50)
    
    for status, entries in diff.items():
        if entries:
            print(f"{status.capitalize()}: {len(entries)}")
            for entry in entries:
                path = entry["path"]
                if isinstance(path, dict):
                    path_str = f"{path['old']} -> {path['new']}"
                else:
                    path_str = path
                
                hash_info = entry.get("hash")
                if isinstance(hash_info, dict):
                    hash_str = f"{hash_info['old'][:8]}..{hash_info['new'][:8]}"
                elif hash_info:
                    hash_str = hash_info[:8]
                else:
                    hash_str = ""
                
                if hash_str:
                    print(f"  {hash_str} {path_str}")
                else:
                    print(f"  {path_str}")
            print()
    
    total_changes = sum(len(entries) for entries in diff.values())
    if total_changes == 0:
        print("No changes found")
    else:
        print(f"Total changes: {total_changes}")


def main():
    """Command line interface for the get_dvc_diff function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Get DVC diff in JSON format using Python API",
        formatter_class=argparse.RawDescriptionHelpFormatter
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
    
    parser.add_argument(
        "--summary",
        action="store_true",
        default=False,
        help="Print a summary of the diff"
    )
    
    parser.add_argument(
        "--quiet",
        action="store_true",
        default=False,
        help="Suppress output messages"
    )
    
    args = parser.parse_args()
    
    try:
        diff = get_dvc_diff(
            a_rev=args.a_rev,
            b_rev=args.b_rev,
            targets=args.targets,
            recursive=args.recursive,
            repo_path=args.repo_path,
            verbose=not args.quiet
        )
        
        if args.summary:
            print_diff_summary(diff)
        else:
            # Convert to JSON
            if args.pretty:
                json_output = json.dumps(diff, indent=2, sort_keys=True)
            else:
                json_output = json.dumps(diff, sort_keys=True)
            
            # Output the result
            if args.output:
                save_diff_to_file(diff, args.output, args.pretty)
                if not args.quiet:
                    print(f"Diff output written to {args.output}")
            else:
                print(json_output)
        
        return 0
        
    except (DvcException, FileNotFoundError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main()) 