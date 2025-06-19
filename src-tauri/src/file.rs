use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
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

fn get_repo_git_status(path: &Path) -> Result<(PathBuf, HashMap<String, String>), String> {
    // Find the git repository root
    let repo_root_output = std::process::Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to find git repository: {}", e))?;

    if !repo_root_output.status.success() {
        return Err("Not a git repository".to_string());
    }

    let repo_root = String::from_utf8_lossy(&repo_root_output.stdout)
        .trim()
        .to_string();
    if repo_root.is_empty() {
        return Err("Invalid git repository root".to_string());
    }

    let repo_root_path = PathBuf::from(repo_root);

    // Get git status for the entire repository
    let output = std::process::Command::new("git")
        .arg("status")
        .arg("--porcelain")
        .current_dir(&repo_root_path)
        .output()
        .map_err(|e| format!("Failed to execute git status: {}", e))?;

    if !output.status.success() {
        return Err("Git status command failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut status_map = HashMap::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.len() < 3 {
            continue;
        }
        let x = trimmed.chars().nth(0).unwrap();
        let y = trimmed.chars().nth(1).unwrap();
        let file_path = trimmed.chars().skip(3).collect::<String>();

        let status = match (x, y) {
            ('?', '?') => "untracked",
            ('A', _) | (_, 'A') => "added",
            ('M', _) | (_, 'M') => "modified",
            ('D', _) | (_, 'D') => "deleted",
            (' ', ' ') => "committed",
            _ => "other",
        }
        .to_string();

        status_map.insert(file_path, status);
    }

    Ok((repo_root_path, status_map))
}

fn get_file_tree(
    path: &Path,
    repo_root: &Path,
    git_status_map: &HashMap<String, String>,
) -> std::io::Result<FileNode> {
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

    // Get relative path from repo root for git status lookup
    let get_relative_path = |p: &Path| -> String {
        p.strip_prefix(repo_root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| p.to_string_lossy().replace('\\', "/"))
    };

    // Get git status from the map
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
            git_status_map
                .get(&get_relative_path(&dvc_file))
                .cloned()
                .unwrap_or_else(|| "untracked".to_string())
        } else {
            let dvc_file = path.to_path_buf();
            if let Some(parent) = dvc_file.parent() {
                let dvc_name = format!("{}.dvc", name);
                let dvc_path = parent.join(dvc_name);
                git_status_map
                    .get(&get_relative_path(&dvc_path))
                    .cloned()
                    .unwrap_or_else(|| "untracked".to_string())
            } else {
                "error".to_string()
            }
        }
    } else {
        git_status_map
            .get(&get_relative_path(path))
            .cloned()
            .unwrap_or_else(|| "untracked".to_string())
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
            // Skip symlinks to prevent infinite recursion
            let entry_metadata = entry.metadata()?;
            if entry_metadata.file_type().is_symlink() {
                continue;
            }
            let child = get_file_tree(&entry_path, repo_root, git_status_map)?;
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
    let path = Path::new(path);
    let (repo_root, git_status_map) = get_repo_git_status(path)?;
    get_file_tree(path, &repo_root, &git_status_map).map_err(|e| e.to_string())
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
    Ok(selected_files.paths.iter().cloned().collect())
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
