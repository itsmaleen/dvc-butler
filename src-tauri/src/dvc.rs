use git2::Repository;
use git2::Signature;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use tauri::command;
use tauri::AppHandle;
use tauri::Manager;

/// Helper function to find script and venv paths using Tauri's resource system
fn find_script_path(app_handle: &AppHandle, exe_name: &str) -> Result<std::path::PathBuf, String> {
    println!("Finding script path for: {}", exe_name);

    // Determine the appropriate extension based on platform
    let extension = if cfg!(target_os = "windows") {
        ".exe"
    } else {
        ".bin"
    };
    let script_name = if exe_name.ends_with(".exe") {
        exe_name.replace(".exe", extension)
    } else if exe_name.ends_with(".bin") {
        exe_name.replace(".bin", extension)
    } else {
        format!("{}{}", exe_name, extension)
    };

    // First, check if we're in development mode (check dvc-scripts in project root)
    let project_root =
        std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
    println!("Project root: {}", project_root.display());

    let scripts_path = project_root.join("dvc-scripts").join(&script_name);
    println!("Development scripts path: {}", scripts_path.display());
    if scripts_path.exists() {
        println!("Development scripts path exists");
        println!(
            "Found script in development dvc-scripts: {}",
            scripts_path.display()
        );
        return Ok(scripts_path);
    }
    println!("Development scripts path does not exist");

    // If not found in development, try to get from bundled resources
    let resource_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    let bundled_script_path = resource_path.join("dvc-scripts").join(&script_name);
    println!("Bundled script path: {}", bundled_script_path.display());
    if bundled_script_path.exists() {
        println!(
            "Found script in bundled resources: {}",
            bundled_script_path.display()
        );
        return Ok(bundled_script_path);
    }
    println!("Bundled script path does not exist");

    Err(format!(
        "Executable '{}' not found in development dvc-scripts or bundled resources",
        script_name
    ))
}

#[command]
pub fn init_dvc_project(app_handle: AppHandle, path: &str) -> Result<String, String> {
    // First initialize git repository using git2
    let repo = Repository::init(path)
        .map_err(|e| format!("Failed to initialize git repository: {}", e))?;

    // Create an initial commit if there are no commits yet
    if repo.head().is_err() {
        // Create empty .gitignore if it doesn't exist
        let gitignore_path = Path::new(path).join(".gitignore");
        if !gitignore_path.exists() {
            std::fs::write(&gitignore_path, "")
                .map_err(|e| format!("Failed to create .gitignore: {}", e))?;
        }

        let sig = Signature::now("fenn-app", "fenn@app.local")
            .map_err(|e| format!("Failed to create signature: {}", e))?;
        let mut index = repo
            .index()
            .map_err(|e| format!("Failed to get repository index: {}", e))?;

        // Only add .gitignore to the initial commit
        index
            .add_path(Path::new(".gitignore"))
            .map_err(|e| format!("Failed to add .gitignore to index: {}", e))?;

        let tree_id = index
            .write_tree()
            .map_err(|e| format!("Failed to write tree: {}", e))?;
        let tree = repo
            .find_tree(tree_id)
            .map_err(|e| format!("Failed to find tree: {}", e))?;
        // No parents for the first commit
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .map_err(|e| format!("Failed to create initial commit: {}", e))?;
    }

    // Find the exe path using the helper function
    let exe_path = find_script_path(&app_handle, "dvc_init_script.exe")?;

    // Then initialize DVC using the exe
    let dvc_init = Command::new(exe_path)
        .arg("--repo-path")
        .arg(path)
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run dvc_init_script.exe: {}", e))?;

    if !dvc_init.status.success() {
        return Err(format!(
            "DVC init failed: {}",
            String::from_utf8_lossy(&dvc_init.stderr)
        ));
    }

    Ok("Successfully initialized Git and DVC repository".to_string())
}

#[command]
pub fn add_dvc_file(app_handle: AppHandle, path: &str, file: &str) -> Result<String, String> {
    println!("Adding DVC file: {}", file);
    println!("Path: {}", path);

    // Find the exe path using the helper function
    let exe_path = find_script_path(&app_handle, "dvc_add_script.exe")?;

    // Step 1: dvc add <file> using the exe
    let dvc_add = Command::new(exe_path)
        .arg(file)
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run dvc_add_script.exe: {}", e))?;

    if !dvc_add.status.success() {
        return Err(format!(
            "DVC add failed: {}",
            String::from_utf8_lossy(&dvc_add.stderr)
        ));
    }

    // Step 2: git add .gitignore <file>.dvc using git2
    let repo =
        Repository::open(path).map_err(|e| format!("Failed to open git repository: {}", e))?;

    // Ensure there's an initial commit if needed
    if repo.head().is_err() {
        println!("No HEAD found, creating initial commit...");
        // Create empty .gitignore if it doesn't exist
        let gitignore_path = Path::new(path).join(".gitignore");
        if !gitignore_path.exists() {
            std::fs::write(&gitignore_path, "")
                .map_err(|e| format!("Failed to create .gitignore: {}", e))?;
        }

        let sig = Signature::now("fenn-app", "fenn@app.local")
            .map_err(|e| format!("Failed to create signature: {}", e))?;
        let mut index = repo
            .index()
            .map_err(|e| format!("Failed to get repository index: {}", e))?;

        // Only add .gitignore to the initial commit
        index
            .add_path(Path::new(".gitignore"))
            .map_err(|e| format!("Failed to add .gitignore to index: {}", e))?;

        let tree_id = index
            .write_tree()
            .map_err(|e| format!("Failed to write tree: {}", e))?;
        let tree = repo
            .find_tree(tree_id)
            .map_err(|e| format!("Failed to find tree: {}", e))?;
        // No parents for the first commit
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .map_err(|e| format!("Failed to create initial commit: {}", e))?;
        println!("Initial commit created successfully");
    }

    // Get the repository root path
    let repo_root = repo
        .workdir()
        .ok_or_else(|| "Repository has no working directory".to_string())?;

    println!("Repository root: {}", repo_root.display());
    println!("Original file path: {}", file);

    // Convert file path to relative path from repository root
    let file_path = Path::new(file);
    let relative_file_path = if file_path.is_absolute() {
        let relative = file_path
            .strip_prefix(repo_root)
            .map_err(|e| format!("Failed to make file path relative: {}", e))?;
        println!(
            "Converted absolute path to relative: {}",
            relative.display()
        );
        relative
    } else {
        println!("File path is already relative: {}", file_path.display());
        file_path
    };

    // Check if the file already has a .dvc extension
    let dvc_file = if relative_file_path.extension().and_then(|e| e.to_str()) == Some("dvc") {
        // File already has .dvc extension, use it as is
        println!(
            "File already has .dvc extension: {}",
            relative_file_path.display()
        );
        relative_file_path.to_string_lossy().to_string()
    } else {
        // Add .dvc extension
        let dvc_path = format!("{}.dvc", relative_file_path.to_string_lossy());
        println!("Added .dvc extension: {}", dvc_path);
        dvc_path
    };

    println!("Final DVC file path to add: {}", dvc_file);

    // Add .gitignore to index
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get repository index: {}", e))?;

    index
        .add_path(Path::new(".gitignore"))
        .map_err(|e| format!("Failed to add .gitignore to index: {}", e))?;

    // Add .dvc file to index using relative path
    index
        .add_path(Path::new(&dvc_file))
        .map_err(|e| format!("Failed to add {} to index: {}", dvc_file, e))?;

    // Write the index
    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;

    Ok(format!(
        "Successfully added {} to DVC and staged .gitignore and {} for git",
        file, dvc_file
    ))
}

pub fn dvc_diff(app_handle: &AppHandle, path: &Path) -> Result<HashMap<String, String>, String> {
    println!("dvc_diff: {}", path.display());

    // Find the exe path using the helper function
    let exe_path = find_script_path(app_handle, "dvc_diff_script.exe")?;

    println!("Using exe path: {}", exe_path.display());

    // Run the exe
    let output = Command::new(exe_path)
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run dvc_diff_script.exe: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse dvc diff JSON: {}", e))?;

    let mut status_map = HashMap::new();
    let categories = [
        ("added", "added"),
        ("deleted", "deleted"),
        ("modified", "modified"),
        ("renamed", "renamed"),
        ("not in cache", "not in cache"),
    ];

    // Helper function to normalize paths
    let normalize_path = |p: &str| -> String { Path::new(p).to_string_lossy().replace('\\', "/") };

    for (cat_key, status) in &categories {
        if let Some(arr) = json.get(*cat_key).and_then(|v| v.as_array()) {
            for entry in arr {
                // For 'renamed', DVC gives objects with 'path' and 'path_old'. For others, just 'path'.
                if *cat_key == "renamed" {
                    if let Some(path) = entry.get("path").and_then(|v| v.as_str()) {
                        status_map.insert(normalize_path(path), status.to_string());
                    }
                } else {
                    if let Some(path) = entry.get("path").and_then(|v| v.as_str()) {
                        status_map.insert(normalize_path(path), status.to_string());
                    }
                }
            }
        }
    }
    Ok(status_map)
}
