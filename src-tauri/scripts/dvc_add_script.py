#!/usr/bin/env python3
"""
DVC Add Script

This script performs the same action as 'dvc add' using the DVC Python API
instead of the command line interface.

Usage:
    python dvc_add_script.py <file_or_directory_path> [options]

Examples:
    python dvc_add_script.py data.csv
    python dvc_add_script.py data/ --glob
    python dvc_add_script.py *.csv --glob --no-commit
    python dvc_add_script.py data.csv --out processed_data.csv
"""

import argparse
import sys
from pathlib import Path
from typing import List, Optional

from dvc.repo import Repo
from dvc.exceptions import DvcException, InvalidArgumentError


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Add files or directories to DVC tracking using Python API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "targets",
        nargs="+",
        help="Input files/directories to add to DVC tracking"
    )
    
    parser.add_argument(
        "--no-commit",
        action="store_true",
        default=False,
        help="Don't put files/directories into cache"
    )
    
    parser.add_argument(
        "--glob",
        action="store_true",
        default=False,
        help="Allows targets containing shell-style wildcards"
    )
    
    parser.add_argument(
        "-o", "--out",
        help="Destination path to put files to",
        metavar="<path>"
    )
    
    parser.add_argument(
        "--to-remote",
        action="store_true",
        default=False,
        help="Download it directly to the remote"
    )
    
    parser.add_argument(
        "-r", "--remote",
        help="Remote storage to download to",
        metavar="<name>"
    )
    
    parser.add_argument(
        "--remote-jobs",
        type=int,
        help="Number of jobs to run simultaneously when pushing data to remote (default: 4 * cpu_count)",
        metavar="<number>"
    )
    
    parser.add_argument(
        "-f", "--force",
        action="store_true",
        default=False,
        help="Override local file or folder if exists"
    )
    
    parser.add_argument(
        "--no-relink",
        dest="relink",
        action="store_false",
        help="Don't recreate links from cache to workspace"
    )
    
    parser.add_argument(
        "--repo-path",
        default=".",
        help="Path to the DVC repository (default: current directory)"
    )
    
    return parser.parse_args()


def validate_args(args):
    """Validate command line arguments."""
    invalid_opt = None
    
    if args.to_remote or args.out:
        message = "{option} can't be used with "
        message += "--to-remote" if args.to_remote else "--out"
        if len(args.targets) != 1:
            invalid_opt = "multiple targets"
        elif args.glob:
            invalid_opt = "--glob option"
        elif args.no_commit:
            invalid_opt = "--no-commit option"
    else:
        message = "{option} can't be used without --to-remote"
        if args.remote:
            invalid_opt = "--remote"
        elif args.remote_jobs:
            invalid_opt = "--remote-jobs"
    
    if invalid_opt is not None:
        raise InvalidArgumentError(message.format(option=invalid_opt))


def main():
    """Main function to execute DVC add operation."""
    try:
        args = parse_arguments()
        validate_args(args)
    except InvalidArgumentError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    
    try:
        # Initialize DVC repository
        repo = Repo(args.repo_path)
        
        # Perform the add operation
        stages = repo.add(
            targets=args.targets,
            no_commit=args.no_commit,
            glob=args.glob,
            out=args.out,
            remote=args.remote,
            to_remote=args.to_remote,
            remote_jobs=args.remote_jobs,
            force=args.force,
            relink=args.relink,
        )
        
        # Print results
        if stages:
            print(f"Successfully added {len(stages)} file(s) to DVC tracking:")
            for stage in stages:
                print(f"  - {stage.relpath}")
        else:
            print("No files were added to DVC tracking.")
        
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