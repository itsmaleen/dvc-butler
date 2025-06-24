# DVC Scripts

This repository contains Python scripts that perform the same actions as DVC commands using the DVC Python API instead of the command line interface.

## Files

### Add Scripts
- `dvc_add_script.py` - Complete command-line script with full argument parsing
- `dvc_add_function.py` - Module with reusable function that can be imported
- `example_usage.py` - Example usage of the add function

### Diff Scripts
- `dvc_diff_script.py` - Complete command-line script for DVC diff with JSON output
- `dvc_diff_function.py` - Module with reusable function for getting DVC diff
- `example_diff_usage.py` - Example usage of the diff function

### Other Files
- `requirements.txt` - Python dependencies
- `README.md` - This documentation

## Installation

1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Make sure you have a DVC repository initialized in your project:
   ```bash
   dvc init
   ```

## Usage

### DVC Add Scripts

#### Option 1: Using the Command-Line Script

The `dvc_add_script.py` provides a complete command-line interface similar to `dvc add`:

```bash
# Add a single file
python dvc_add_script.py data.csv

# Add multiple files
python dvc_add_script.py data1.csv data2.csv data3.csv

# Add with glob pattern
python dvc_add_script.py *.csv --glob

# Add without committing to cache
python dvc_add_script.py data.csv --no-commit

# Add with custom output path
python dvc_add_script.py raw_data.csv --out processed_data.csv

# Add to remote storage
python dvc_add_script.py data.csv --to-remote --remote my-remote

# Add with force override
python dvc_add_script.py data.csv --force
```

#### Option 2: Using the Function Module

The `dvc_add_function.py` provides a reusable function that can be imported into other Python scripts:

```python
from dvc_add_function import add_to_dvc

# Add a single file
stages = add_to_dvc("data.csv")

# Add multiple files with options
stages = add_to_dvc(
    ["data1.csv", "data2.csv"], 
    no_commit=True, 
    glob=True
)

# Add with custom output path
stages = add_to_dvc("raw_data.csv", out="processed_data.csv")

# Add to remote storage
stages = add_to_dvc(
    "data.csv", 
    to_remote=True, 
    remote="my-remote"
)

# Add with quiet mode (no output messages)
stages = add_to_dvc("data.csv", verbose=False)
```

### DVC Diff Scripts

#### Option 1: Using the Command-Line Script

The `dvc_diff_script.py` provides a complete command-line interface similar to `dvc diff --json`:

```bash
# Get diff between HEAD and workspace
python dvc_diff_script.py

# Get diff between specific commits
python dvc_diff_script.py HEAD workspace

# Get diff between specific commits with pretty output
python dvc_diff_script.py v1.0 v2.0 --pretty

# Get diff for specific targets
python dvc_diff_script.py HEAD workspace --targets data.csv model.pkl

# Save diff to file
python dvc_diff_script.py --output diff_result.json --pretty

# Get recursive diff
python dvc_diff_script.py --recursive
```

#### Option 2: Using the Function Module

The `dvc_diff_function.py` provides a reusable function that can be imported into other Python scripts:

```python
from dvc_diff_function import get_dvc_diff, print_diff_summary, save_diff_to_file

# Get diff between HEAD and workspace
diff = get_dvc_diff()

# Get diff between specific commits
diff = get_dvc_diff("v1.0", "v2.0")

# Get diff for specific targets
diff = get_dvc_diff("HEAD", "workspace", targets=["data.csv", "model.pkl"])

# Get recursive diff
diff = get_dvc_diff(recursive=True)

# Print a summary of the diff
print_diff_summary(diff)

# Save diff to file
save_diff_to_file(diff, "diff_output.json", pretty=True)

# Get diff with quiet mode
diff = get_dvc_diff(verbose=False)
```

## Command-Line Options

### Add Script Options
- `targets` - Input files/directories to add to DVC tracking
- `--repo-path` - Path to the DVC repository (default: current directory)
- `--no-commit` - Don't put files/directories into cache
- `--glob` - Allows targets containing shell-style wildcards
- `-o, --out` - Destination path to put files to
- `--to-remote` - Download it directly to the remote
- `-r, --remote` - Remote storage to download to
- `--remote-jobs` - Number of jobs to run simultaneously when pushing data to remote
- `-f, --force` - Override local file or folder if exists
- `--no-relink` - Don't recreate links from cache to workspace
- `--quiet` - Suppress output messages (function module only)

### Diff Script Options
- `a_rev` - Old Git commit to compare (defaults to HEAD)
- `b_rev` - New Git commit to compare (defaults to workspace)
- `--targets` - Specific DVC-tracked files to compare
- `--recursive` - Recursively expand directories
- `--repo-path` - Path to the DVC repository (default: current directory)
- `--pretty` - Pretty print JSON output with indentation
- `--output` - Output file path (default: stdout)
- `--summary` - Print a summary of the diff
- `--quiet` - Suppress output messages

## JSON Output Format

The diff scripts return JSON in the following format:

```json
{
  "added": [
    {
      "path": "new_file.csv",
      "hash": "abc123def456"
    }
  ],
  "deleted": [
    {
      "path": "old_file.csv",
      "hash": "def456ghi789"
    }
  ],
  "modified": [
    {
      "path": "data/features/",
      "hash": {
        "old": "3338d2c21bdb521cda0ba4add89e1cb0.dir",
        "new": "42c7025fc0edeb174069280d17add2d4.dir"
      }
    },
    {
      "path": "model.pkl",
      "hash": {
        "old": "43630cce66a2432dcecddc9dd006d0a7",
        "new": "662eb7f64216d9c2c1088d0a5e2c6951"
      }
    }
  ],
  "renamed": [
    {
      "path": {
        "old": "old_name.txt",
        "new": "new_name.txt"
      },
      "hash": "abc123def456"
    }
  ],
  "not in cache": [
    {
      "path": "missing_file.txt",
      "hash": "abc123def456"
    }
  ]
}
```

## Examples

### Basic Usage

```bash
# Add a CSV file
python dvc_add_script.py data.csv

# Get diff between HEAD and workspace
python dvc_diff_script.py

# Add all CSV files in current directory
python dvc_add_script.py *.csv --glob

# Get diff for specific files
python dvc_diff_script.py --targets data.csv model.pkl
```

### Advanced Usage

```bash
# Add without committing to cache (useful for large files)
python dvc_add_script.py large_dataset.csv --no-commit

# Get diff between specific commits with pretty output
python dvc_diff_script.py v1.0 v2.0 --pretty --output version_diff.json

# Add with custom output name
python dvc_add_script.py raw_data.csv --out processed_data.csv

# Get recursive diff
python dvc_diff_script.py --recursive

# Add directly to remote storage
python dvc_add_script.py data.csv --to-remote --remote my-s3-bucket

# Get diff summary
python dvc_diff_script.py --summary
```

### Integration in Python Scripts

```python
from dvc_add_function import add_to_dvc
from dvc_diff_function import get_dvc_diff, print_diff_summary
import os

# Process and add multiple files
data_files = ["data1.csv", "data2.csv", "data3.csv"]

for file in data_files:
    if os.path.exists(file):
        try:
            stages = add_to_dvc(file, verbose=True)
            print(f"Successfully added {file}")
        except Exception as e:
            print(f"Failed to add {file}: {e}")
    else:
        print(f"File {file} not found")

# Get diff and analyze changes
diff = get_dvc_diff()
print_diff_summary(diff)

# Check for specific types of changes
if diff["modified"]:
    print(f"Found {len(diff['modified'])} modified files")
    for entry in diff["modified"]:
        print(f"  - {entry['path']}")
```

## Error Handling

The scripts handle various error conditions:

- **FileNotFoundError**: When target files don't exist
- **InvalidArgumentError**: When arguments are invalid or incompatible
- **DvcException**: When DVC operations fail
- **General exceptions**: Unexpected errors

All errors are printed to stderr and the scripts return appropriate exit codes.

## Differences from DVC Commands

The Python scripts provide the same functionality as the DVC commands but with these differences:

1. **Python API**: Uses DVC's Python API instead of CLI
2. **Better Integration**: Can be imported and used in other Python scripts
3. **Customizable Output**: Can control verbosity and output format
4. **Error Handling**: More detailed error messages and handling
5. **JSON Output**: Diff scripts always return structured JSON data

## Requirements

- Python 3.7+
- DVC 3.60.0+
- A DVC repository (run `dvc init` if not already initialized)

## License

This project is open source and available under the MIT License. 