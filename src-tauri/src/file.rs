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
}

fn get_file_tree(path: &Path) -> std::io::Result<FileNode> {
    let metadata = fs::metadata(path)?;
    let name = path
        .file_name()
        .unwrap_or_else(|| path.as_os_str())
        .to_string_lossy()
        .to_string();

    if metadata.is_dir() {
        let mut children = Vec::new();
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let child = get_file_tree(&entry.path())?;
            children.push(child);
        }
        Ok(FileNode {
            name,
            size: metadata.len(),
            is_directory: true,
            children: Some(children),
        })
    } else {
        Ok(FileNode {
            name,
            size: metadata.len(),
            is_directory: false,
            children: None,
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

#[tauri::command]
pub fn get_git_status(path: &str) -> Result<Vec<GitStatusEntry>, String> {
    let output = std::process::Command::new("git")
        .arg("status")
        .arg("--porcelain")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "git status failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut entries = Vec::new();
    for line in stdout.lines() {
        // Format: XY <file>
        // X = staged, Y = unstaged
        let trimmed = line.trim();
        if trimmed.len() < 3 {
            continue;
        }
        let x = trimmed.chars().nth(0).unwrap();
        let y = trimmed.chars().nth(1).unwrap();
        let file_path = trimmed[3..].to_string();
        let status = match (x, y) {
            ('?', '?') => "untracked",
            ('A', _) | (_, 'A') => "added",
            ('M', _) | (_, 'M') => "modified",
            ('D', _) | (_, 'D') => "deleted",
            (' ', ' ') => "committed",
            _ => "other",
        };
        entries.push(GitStatusEntry {
            path: file_path,
            status: status.to_string(),
        });
    }
    Ok(entries)
}
