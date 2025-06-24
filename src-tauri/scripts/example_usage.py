#!/usr/bin/env python3
"""
Example Usage of DVC Add Function

This script demonstrates various ways to use the add_to_dvc function
from dvc_add_function.py
"""

import os
import tempfile
from pathlib import Path

from dvc_add_function import add_to_dvc


def create_sample_files():
    """Create sample files for demonstration."""
    files = {
        "sample_data.csv": "id,name,value\n1,Alice,100\n2,Bob,200\n3,Charlie,300",
        "config.json": '{"setting": "value", "enabled": true}',
        "data/processed.csv": "id,processed_value\n1,150\n2,250\n3,350"
    }
    
    created_files = []
    
    for file_path, content in files.items():
        # Create directory if needed
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Write file content
        with open(file_path, 'w') as f:
            f.write(content)
        
        created_files.append(file_path)
        print(f"Created: {file_path}")
    
    return created_files


def example_basic_usage():
    """Demonstrate basic usage of add_to_dvc function."""
    print("\n=== Basic Usage Example ===")
    
    # Create sample files
    files = create_sample_files()
    
    try:
        # Add a single file
        print("\n1. Adding single file:")
        stages = add_to_dvc("sample_data.csv")
        print(f"   Added {len(stages)} stage(s)")
        
        # Add multiple files
        print("\n2. Adding multiple files:")
        stages = add_to_dvc(["config.json", "data/processed.csv"])
        print(f"   Added {len(stages)} stage(s)")
        
        # Add with glob pattern
        print("\n3. Adding with glob pattern:")
        stages = add_to_dvc("*.csv", glob=True)
        print(f"   Added {len(stages)} stage(s)")
        
    except Exception as e:
        print(f"Error: {e}")


def example_advanced_options():
    """Demonstrate advanced options of add_to_dvc function."""
    print("\n=== Advanced Options Example ===")
    
    # Create a sample file
    with open("large_file.txt", 'w') as f:
        f.write("This is a large file content\n" * 1000)
    
    try:
        # Add without committing to cache
        print("\n1. Adding without committing to cache:")
        stages = add_to_dvc("large_file.txt", no_commit=True)
        print(f"   Added {len(stages)} stage(s) without cache commit")
        
        # Add with custom output path
        print("\n2. Adding with custom output path:")
        stages = add_to_dvc("large_file.txt", out="renamed_large_file.txt", force=True)
        print(f"   Added {len(stages)} stage(s) with custom name")
        
        # Add with quiet mode
        print("\n3. Adding with quiet mode:")
        stages = add_to_dvc("config.json", verbose=False)
        print(f"   Added {len(stages)} stage(s) quietly")
        
    except Exception as e:
        print(f"Error: {e}")


def example_error_handling():
    """Demonstrate error handling."""
    print("\n=== Error Handling Example ===")
    
    # Try to add non-existent file
    print("\n1. Trying to add non-existent file:")
    try:
        stages = add_to_dvc("non_existent_file.txt")
    except FileNotFoundError as e:
        print(f"   Caught FileNotFoundError: {e}")
    except Exception as e:
        print(f"   Unexpected error: {e}")
    
    # Try to add with invalid options
    print("\n2. Trying to add with invalid options:")
    try:
        stages = add_to_dvc(["file1.txt", "file2.txt"], to_remote=True)
    except Exception as e:
        print(f"   Caught error: {e}")


def example_batch_processing():
    """Demonstrate batch processing of files."""
    print("\n=== Batch Processing Example ===")
    
    # Create multiple files
    for i in range(3):
        with open(f"batch_file_{i}.txt", 'w') as f:
            f.write(f"Content for batch file {i}\n")
    
    # Process files in batch
    print("\nProcessing files in batch:")
    batch_files = ["batch_file_0.txt", "batch_file_1.txt", "batch_file_2.txt"]
    
    successful = 0
    failed = 0
    
    for file_path in batch_files:
        try:
            stages = add_to_dvc(file_path, verbose=False)
            print(f"   ✓ Successfully added {file_path}")
            successful += 1
        except Exception as e:
            print(f"   ✗ Failed to add {file_path}: {e}")
            failed += 1
    
    print(f"\nBatch processing complete: {successful} successful, {failed} failed")


def cleanup_files():
    """Clean up created files."""
    files_to_remove = [
        "sample_data.csv",
        "config.json", 
        "data/processed.csv",
        "large_file.txt",
        "renamed_large_file.txt",
        "batch_file_0.txt",
        "batch_file_1.txt", 
        "batch_file_2.txt"
    ]
    
    print("\n=== Cleaning up files ===")
    for file_path in files_to_remove:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"   Removed: {file_path}")
        except Exception as e:
            print(f"   Failed to remove {file_path}: {e}")
    
    # Remove empty directories
    try:
        if os.path.exists("data") and not os.listdir("data"):
            os.rmdir("data")
            print("   Removed empty directory: data")
    except Exception as e:
        print(f"   Failed to remove data directory: {e}")


def main():
    """Run all examples."""
    print("DVC Add Function Examples")
    print("=" * 50)
    
    # Check if we're in a DVC repository
    if not os.path.exists(".dvc"):
        print("Warning: This doesn't appear to be a DVC repository.")
        print("Run 'dvc init' first to initialize DVC in this directory.")
        print("Examples will still run but may not work as expected.\n")
    
    try:
        example_basic_usage()
        example_advanced_options()
        example_error_handling()
        example_batch_processing()
    finally:
        cleanup_files()
    
    print("\nExamples completed!")


if __name__ == "__main__":
    main() 