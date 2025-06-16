use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;
use tauri::State;

use crate::state::SelectedFilesState;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    name: String,
    size: u64,
    is_directory: bool,
    children: Option<Vec<FileNode>>,
    has_dvc_file: bool,
    git_status: String,
}

fn get_git_status_for_path(path: &Path) -> String {
    // Find the git repository root
    let repo_root_output = std::process::Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .current_dir(path.parent().unwrap_or_else(|| Path::new(".")))
        .output();
    let repo_root = if let Ok(output) = repo_root_output {
        if output.status.success() {
            let root = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !root.is_empty() {
                Some(std::path::PathBuf::from(root))
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let output = std::process::Command::new("git")
        .arg("status")
        .arg("--porcelain")
        .current_dir(parent)
        .output();
    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Compute the relative path from the repo root
            let rel_path = if let Some(repo_root) = &repo_root {
                path.strip_prefix(repo_root)
                    .map(|p| p.to_string_lossy().replace('\\', "/"))
                    .unwrap_or_else(|_| path.to_string_lossy().replace('\\', "/"))
            } else {
                path.to_string_lossy().replace('\\', "/")
            };
            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.len() < 3 {
                    continue;
                }
                let x = trimmed.chars().nth(0).unwrap();
                let y = trimmed.chars().nth(1).unwrap();
                let file_path = trimmed[3..].to_string();
                // Compare using the relative path
                if file_path == rel_path {
                    return match (x, y) {
                        ('?', '?') => "untracked",
                        ('A', _) | (_, 'A') => "added",
                        ('M', _) | (_, 'M') => "modified",
                        ('D', _) | (_, 'D') => "deleted",
                        (' ', ' ') => "committed",
                        _ => "other",
                    }
                    .to_string();
                }
            }
            // If not found, treat as committed (clean)
            "committed".to_string()
        } else {
            "error".to_string()
        }
    } else {
        "error".to_string()
    }
}

fn get_file_tree(path: &Path) -> std::io::Result<FileNode> {
    let metadata = fs::metadata(path)?;
    let name = path
        .file_name()
        .unwrap_or_else(|| path.as_os_str())
        .to_string_lossy()
        .to_string();

    let has_dvc_file = if path.is_file() {
        let mut dvc_file = path.to_path_buf();
        dvc_file.set_extension(format!(
            "{}{}",
            path.extension()
                .map(|e| e.to_string_lossy())
                .unwrap_or_default(),
            ".dvc"
        ));
        dvc_file.exists()
    } else {
        let dvc_file = path.to_path_buf();
        if let Some(parent) = dvc_file.parent() {
            let dvc_name = format!("{}.dvc", name);
            let dvc_path = parent.join(dvc_name);
            dvc_path.exists()
        } else {
            false
        }
    };

    // Determine which file to check git status for
    let git_status = if has_dvc_file {
        if path.is_file() {
            let mut dvc_file = path.to_path_buf();
            dvc_file.set_extension(format!(
                "{}{}",
                path.extension()
                    .map(|e| e.to_string_lossy())
                    .unwrap_or_default(),
                ".dvc"
            ));
            get_git_status_for_path(&dvc_file)
        } else {
            let dvc_file = path.to_path_buf();
            if let Some(parent) = dvc_file.parent() {
                let dvc_name = format!("{}.dvc", name);
                let dvc_path = parent.join(dvc_name);
                get_git_status_for_path(&dvc_path)
            } else {
                "error".to_string()
            }
        }
    } else {
        get_git_status_for_path(path)
    };

    if metadata.is_dir() {
        let mut children = Vec::new();
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let entry_path = entry.path();
            let entry_name = entry_path
                .file_name()
                .map(|n| n.to_string_lossy())
                .unwrap_or_default();
            if entry_name.ends_with(".dvc") {
                continue;
            }
            let child = get_file_tree(&entry_path)?;
            children.push(child);
        }
        Ok(FileNode {
            name,
            size: metadata.len(),
            is_directory: true,
            children: Some(children),
            has_dvc_file,
            git_status,
        })
    } else {
        Ok(FileNode {
            name,
            size: metadata.len(),
            is_directory: false,
            children: None,
            has_dvc_file,
            git_status,
        })
    }
}

#[tauri::command]
pub fn get_file_tree_structure(path: &str) -> Result<FileNode, String> {
    get_file_tree(Path::new(path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_file_binary(path: &str) -> Result<String, String> {
    // Normalize path separators for Windows
    let normalized_path = if cfg!(windows) {
        path.replace("/", &std::path::MAIN_SEPARATOR.to_string())
    } else {
        path.to_string()
    };

    let path = Path::new(&normalized_path);

    println!("path.display(): {}", path.display());

    // Read the file as binary
    let content = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Convert binary content to base64
    let base64_content = BASE64.encode(content);

    Ok(base64_content)
}

#[tauri::command]
pub fn get_relative_path(absolute_path: &str) -> Result<String, String> {
    let home_dir = env::var("HOME").map_err(|e| format!("Failed to get HOME directory: {}", e))?;
    let home_path = Path::new(&home_dir);
    let abs_path = Path::new(absolute_path);

    println!("home_path: {}", home_path.display());
    println!("abs_path: {}", abs_path.display());

    abs_path
        .strip_prefix(home_path)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to convert path: {}", e))
}

#[tauri::command]
pub fn add_selected_file(state: State<'_, SelectedFilesState>, path: String) -> Result<(), String> {
    let mut selected_files = state.lock().map_err(|e| e.to_string())?;
    selected_files.add_path(path);
    Ok(())
}

#[tauri::command]
pub fn remove_selected_file(
    state: State<'_, SelectedFilesState>,
    path: String,
) -> Result<(), String> {
    let mut selected_files = state.lock().map_err(|e| e.to_string())?;
    selected_files.remove_path(&path);
    Ok(())
}

#[tauri::command]
pub fn get_selected_files(state: State<'_, SelectedFilesState>) -> Result<Vec<String>, String> {
    let selected_files = state.lock().map_err(|e| e.to_string())?;
    Ok(selected_files.paths.clone())
}

#[tauri::command]
pub fn clear_selected_files(state: State<'_, SelectedFilesState>) -> Result<(), String> {
    let mut selected_files = state.lock().map_err(|e| e.to_string())?;
    selected_files.clear();
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusEntry {
    pub path: String,
    pub status: String, // e.g., "untracked", "modified", "staged", "committed"
}
