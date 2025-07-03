#!/usr/bin/env python3
"""
Example Usage of DVC Diff Function

This script demonstrates various ways to use the get_dvc_diff function
from dvc_diff_function.py
"""

import json
import os
from pathlib import Path

from dvc_diff_function import get_dvc_diff, print_diff_summary, save_diff_to_file


def example_basic_diff():
    """Demonstrate basic diff functionality."""
    print("\n=== Basic Diff Example ===")
    
    try:
        # Get diff between HEAD and workspace
        print("Getting diff between HEAD and workspace...")
        diff = get_dvc_diff()
        
        print("Diff result:")
        print(json.dumps(diff, indent=2))
        
    except Exception as e:
        print(f"Error: {e}")


def example_commit_comparison():
    """Demonstrate comparing specific commits."""
    print("\n=== Commit Comparison Example ===")
    
    try:
        # Get diff between specific commits (if they exist)
        print("Getting diff between HEAD~1 and HEAD...")
        diff = get_dvc_diff("HEAD~1", "HEAD")
        
        print("Diff result:")
        print(json.dumps(diff, indent=2))
        
    except Exception as e:
        print(f"Error: {e}")


def example_target_specific_diff():
    """Demonstrate diff for specific targets."""
    print("\n=== Target-Specific Diff Example ===")
    
    try:
        # Get diff for specific files (if they exist)
        targets = ["data.csv", "model.pkl", "config.yaml"]
        print(f"Getting diff for targets: {targets}")
        
        diff = get_dvc_diff(targets=targets)
        
        print("Diff result:")
        print(json.dumps(diff, indent=2))
        
    except Exception as e:
        print(f"Error: {e}")


def example_diff_summary():
    """Demonstrate diff summary functionality."""
    print("\n=== Diff Summary Example ===")
    
    try:
        # Get diff and show summary
        print("Getting diff and showing summary...")
        diff = get_dvc_diff(verbose=False)
        
        print_diff_summary(diff)
        
    except Exception as e:
        print(f"Error: {e}")


def example_save_diff_to_file():
    """Demonstrate saving diff to file."""
    print("\n=== Save Diff to File Example ===")
    
    try:
        # Get diff and save to file
        print("Getting diff and saving to file...")
        diff = get_dvc_diff(verbose=False)
        
        output_file = "dvc_diff_output.json"
        save_diff_to_file(diff, output_file, pretty=True)
        
        print(f"Diff saved to {output_file}")
        
        # Verify the file was created
        if os.path.exists(output_file):
            print(f"File size: {os.path.getsize(output_file)} bytes")
            
            # Read and display first few lines
            with open(output_file, 'r') as f:
                content = f.read()
                print("File content preview:")
                print(content[:500] + "..." if len(content) > 500 else content)
        
    except Exception as e:
        print(f"Error: {e}")


def example_diff_analysis():
    """Demonstrate analyzing diff results."""
    print("\n=== Diff Analysis Example ===")
    
    try:
        # Get diff and analyze the results
        print("Getting diff and analyzing results...")
        diff = get_dvc_diff(verbose=False)
        
        # Analyze the diff
        total_changes = sum(len(entries) for entries in diff.values())
        print(f"Total changes: {total_changes}")
        
        for status, entries in diff.items():
            if entries:
                print(f"\n{status.capitalize()} files ({len(entries)}):")
                for entry in entries:
                    path = entry["path"]
                    if isinstance(path, dict):
                        path_str = f"{path['old']} -> {path['new']}"
                    else:
                        path_str = path
                    
                    hash_info = entry.get("hash")
                    if isinstance(hash_info, dict):
                        print(f"  {path_str}: {hash_info['old'][:8]} -> {hash_info['new'][:8]}")
                    elif hash_info:
                        print(f"  {path_str}: {hash_info[:8]}")
                    else:
                        print(f"  {path_str}: no hash")
        
    except Exception as e:
        print(f"Error: {e}")


def example_recursive_diff():
    """Demonstrate recursive diff functionality."""
    print("\n=== Recursive Diff Example ===")
    
    try:
        # Get recursive diff
        print("Getting recursive diff...")
        diff = get_dvc_diff(recursive=True, verbose=False)
        
        print("Recursive diff result:")
        print(json.dumps(diff, indent=2))
        
    except Exception as e:
        print(f"Error: {e}")


def example_diff_with_custom_repo():
    """Demonstrate diff with custom repository path."""
    print("\n=== Custom Repository Diff Example ===")
    
    try:
        # Get diff from a different repository path
        custom_repo_path = ".."  # Parent directory
        print(f"Getting diff from repository at: {custom_repo_path}")
        
        diff = get_dvc_diff(repo_path=custom_repo_path, verbose=False)
        
        print("Diff result:")
        print(json.dumps(diff, indent=2))
        
    except Exception as e:
        print(f"Error: {e}")


def example_error_handling():
    """Demonstrate error handling."""
    print("\n=== Error Handling Example ===")
    
    # Try to get diff with non-existent targets
    try:
        print("Trying to get diff with non-existent targets...")
        diff = get_dvc_diff(targets=["non_existent_file.txt"], verbose=False)
        print("Unexpectedly succeeded")
    except FileNotFoundError as e:
        print(f"Caught FileNotFoundError: {e}")
    except Exception as e:
        print(f"Caught other error: {e}")
    
    # Try to get diff from non-existent repository
    try:
        print("Trying to get diff from non-existent repository...")
        diff = get_dvc_diff(repo_path="/non/existent/path", verbose=False)
        print("Unexpectedly succeeded")
    except Exception as e:
        print(f"Caught error: {e}")


def cleanup_files():
    """Clean up created files."""
    print("\n=== Cleaning up files ===")
    
    files_to_remove = ["dvc_diff_output.json"]
    
    for file_path in files_to_remove:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"   Removed: {file_path}")
        except Exception as e:
            print(f"   Failed to remove {file_path}: {e}")


def main():
    """Run all examples."""
    print("DVC Diff Function Examples")
    print("=" * 50)
    
    # Check if we're in a DVC repository
    if not os.path.exists(".dvc"):
        print("Warning: This doesn't appear to be a DVC repository.")
        print("Run 'dvc init' first to initialize DVC in this directory.")
        print("Examples will still run but may not work as expected.\n")
    
    try:
        example_basic_diff()
        example_commit_comparison()
        example_target_specific_diff()
        example_diff_summary()
        example_save_diff_to_file()
        example_diff_analysis()
        example_recursive_diff()
        example_diff_with_custom_repo()
        example_error_handling()
    finally:
        cleanup_files()
    
    print("\nExamples completed!")


if __name__ == "__main__":
    main() 