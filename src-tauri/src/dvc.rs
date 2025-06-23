use git2::Repository;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use tauri::command;

#[command]
pub fn init_dvc_project(path: &str) -> Result<String, String> {
    // First initialize git repository using git2
    let repo = Repository::init(path)
        .map_err(|e| format!("Failed to initialize git repository: {}", e))?;

    // Then initialize DVC
    let dvc_init = Command::new("dvc")
        .arg("init")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to initialize DVC: {}", e))?;

    if !dvc_init.status.success() {
        return Err(format!(
            "DVC init failed: {}",
            String::from_utf8_lossy(&dvc_init.stderr)
        ));
    }

    Ok("Successfully initialized Git and DVC repository".to_string())
}

#[command]
pub fn add_dvc_file(path: &str, file: &str) -> Result<String, String> {
    println!("Adding DVC file: {}", file);
    println!("Path: {}", path);
    // Step 1: dvc add <file>
    let dvc_add = Command::new("dvc")
        .arg("add")
        .arg(file)
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run dvc add: {}", e))?;

    if !dvc_add.status.success() {
        return Err(format!(
            "DVC add failed: {}",
            String::from_utf8_lossy(&dvc_add.stderr)
        ));
    }

    // Step 2: git add .gitignore <file>.dvc using git2
    let repo =
        Repository::open(path).map_err(|e| format!("Failed to open git repository: {}", e))?;

    let dvc_file = format!("{}.dvc", file);

    // Add .gitignore to index
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get repository index: {}", e))?;

    index
        .add_path(Path::new(".gitignore"))
        .map_err(|e| format!("Failed to add .gitignore to index: {}", e))?;

    // Add .dvc file to index
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

pub fn dvc_diff(path: &Path) -> Result<HashMap<String, String>, String> {
    println!("dvc_diff: {}", path.display());
    let output = Command::new("dvc")
        .arg("diff")
        .arg("--json")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run dvc diff: {}", e))?;

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
