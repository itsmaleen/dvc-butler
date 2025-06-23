#!/usr/bin/env python3
"""
DVC Add Function Module

This module provides a simple function to add files to DVC tracking
using the DVC Python API instead of the command line interface.

Usage as module:
    from dvc_add_function import add_to_dvc
    
    # Add a single file
    add_to_dvc("data.csv")
    
    # Add multiple files with options
    add_to_dvc(["data1.csv", "data2.csv"], no_commit=True, glob=True)
    
    # Add with custom output path
    add_to_dvc("raw_data.csv", out="processed_data.csv")
"""

import sys
from typing import Union, List, Optional
from pathlib import Path

from dvc.repo import Repo
from dvc.exceptions import DvcException, InvalidArgumentError


def add_to_dvc(
    targets: Union[str, List[str]],
    repo_path: str = ".",
    no_commit: bool = False,
    glob: bool = False,
    out: Optional[str] = None,
    remote: Optional[str] = None,
    to_remote: bool = False,
    remote_jobs: Optional[int] = None,
    force: bool = False,
    relink: bool = True,
    verbose: bool = True
) -> List:
    """
    Add files or directories to DVC tracking using the Python API.
    
    Args:
        targets: File or directory path(s) to add. Can be a string or list of strings.
        repo_path: Path to the DVC repository (default: current directory).
        no_commit: Don't put files/directories into cache.
        glob: Allows targets containing shell-style wildcards.
        out: Destination path to put files to.
        remote: Remote storage to download to.
        to_remote: Download it directly to the remote.
        remote_jobs: Number of jobs to run simultaneously when pushing data to remote.
        force: Override local file or folder if exists.
        relink: Recreate links from cache to workspace.
        verbose: Print status messages.
    
    Returns:
        List of DVC stages that were created or updated.
    
    Raises:
        DvcException: If DVC operation fails.
        InvalidArgumentError: If arguments are invalid.
        FileNotFoundError: If target files don't exist.
    """
    # Convert single target to list
    if isinstance(targets, str):
        targets = [targets]
    
    # Validate arguments
    if to_remote or out:
        if len(targets) != 1:
            raise InvalidArgumentError("multiple targets can't be used with --to-remote or --out")
        if glob:
            raise InvalidArgumentError("--glob option can't be used with --to-remote or --out")
        if no_commit:
            raise InvalidArgumentError("--no-commit option can't be used with --to-remote or --out")
    else:
        if remote:
            raise InvalidArgumentError("--remote can't be used without --to-remote")
        if remote_jobs:
            raise InvalidArgumentError("--remote-jobs can't be used without --to-remote")
    
    if verbose:
        print(f"Adding {len(targets)} target(s) to DVC tracking...")
    
    # Initialize DVC repository
    repo = Repo(repo_path)
    
    # Perform the add operation
    stages = repo.add(
        targets=targets,
        no_commit=no_commit,
        glob=glob,
        out=out,
        remote=remote,
        to_remote=to_remote,
        remote_jobs=remote_jobs,
        force=force,
        relink=relink,
    )
    
    if verbose:
        if stages:
            print(f"Successfully added {len(stages)} file(s) to DVC tracking:")
            for stage in stages:
                print(f"  - {stage.relpath}")
        else:
            print("No files were added to DVC tracking.")
    
    return stages


def main():
    """Command line interface for the add_to_dvc function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Add files or directories to DVC tracking using Python API",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "targets",
        nargs="+",
        help="Input files/directories to add to DVC tracking"
    )
    
    parser.add_argument(
        "--repo-path",
        default=".",
        help="Path to the DVC repository (default: current directory)"
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
        help="Number of jobs to run simultaneously when pushing data to remote",
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
        "--quiet",
        action="store_true",
        default=False,
        help="Suppress output messages"
    )
    
    args = parser.parse_args()
    
    try:
        stages = add_to_dvc(
            targets=args.targets,
            repo_path=args.repo_path,
            no_commit=args.no_commit,
            glob=args.glob,
            out=args.out,
            remote=args.remote,
            to_remote=args.to_remote,
            remote_jobs=args.remote_jobs,
            force=args.force,
            relink=args.relink,
            verbose=not args.quiet
        )
        return 0
    except (DvcException, InvalidArgumentError, FileNotFoundError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main()) 