#!/usr/bin/env python3
"""
DVC Init Script

This script performs the same action as 'dvc init' using the DVC Python API
instead of the command line interface.

Usage:
    python dvc_init_script.py [--repo-path <path>]

Examples:
    python dvc_init_script.py
    python dvc_init_script.py --repo-path /path/to/repo
"""

import argparse
import sys
from pathlib import Path

from dvc.repo import Repo
from dvc.exceptions import DvcException


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Initialize DVC repository using Python API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--repo-path",
        default=".",
        help="Path to initialize DVC repository (default: current directory)"
    )
    
    return parser.parse_args()


def main():
    """Main function to execute DVC init operation."""
    try:
        args = parse_arguments()
    except Exception as e:
        print(f"Error parsing arguments: {e}", file=sys.stderr)
        return 1
    
    try:
        # Initialize DVC repository
        repo = Repo.init(args.repo_path)
        
        print(f"Successfully initialized DVC repository at: {repo.root_dir}")
        return 0
        
    except DvcException as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main()) 