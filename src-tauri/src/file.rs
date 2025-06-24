use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;
use walkdir::WalkDir;

use crate::dvc;
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

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub git_status: String,
    pub has_dvc_file: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub size: u64,
    pub is_directory: bool,
    pub has_dvc_file: bool,
    pub git_status: String,
}

fn update_git_status_map(repo_root: &Path) -> Result<HashMap<String, String>, String> {
    let mut status_map = HashMap::new();

    // Open the repository using git2
    let repo =
        Repository::open(repo_root).map_err(|e| format!("Failed to open git repository: {}", e))?;

    // Check if repository is empty (no HEAD reference)
    let is_empty = repo.head().is_err();

    if !is_empty {
        // Get the HEAD tree to find tracked files
        let head = repo
            .head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;

        let head_commit = head
            .peel_to_commit()
            .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;

        let tree = head_commit
            .tree()
            .map_err(|e| format!("Failed to get HEAD tree: {}", e))?;

        // Get all tracked files from HEAD
        let mut tracked_files = Vec::new();
        tree.walk(git2::TreeWalkMode::PreOrder, |root, entry| {
            if let Some(name) = entry.name() {
                let path = if root.is_empty() {
                    name.to_string()
                } else {
                    format!("{}/{}", root, name)
                };
                tracked_files.push(path);
            }
            git2::TreeWalkResult::Ok
        })
        .map_err(|e| format!("Failed to walk tree: {}", e))?;

        // First, mark all tracked files in HEAD as pushed
        for file in tracked_files {
            status_map.insert(file, "pushed".to_string());
        }
    }

    // Get git status for the entire repository using git2
    let mut status_options = StatusOptions::new();
    status_options.include_untracked(true);
    status_options.include_ignored(false);
    status_options.include_unmodified(false);

    let statuses = repo
        .statuses(Some(&mut status_options))
        .map_err(|e| format!("Failed to get git status: {}", e))?;

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().ok_or("Failed to get path from status entry")?;

        let normalized_path = Path::new(path).to_string_lossy().replace('\\', "/");

        let git_status = if status.is_wt_new() {
            "untracked"
        } else if status.is_index_new() {
            "staged"
        } else if status.is_wt_modified() {
            "modified"
        } else if status.is_index_modified() {
            "staged"
        } else if status.is_wt_deleted() {
            "deleted"
        } else if status.is_index_deleted() {
            "staged"
        } else if status.is_conflicted() {
            "conflict"
        } else {
            "other"
        };

        status_map.insert(normalized_path, git_status.to_string());
    }

    Ok(status_map)
}

fn get_repo_git_status(path: &Path) -> Result<(PathBuf, HashMap<String, String>), String> {
    // Find the git repository root using git2
    let repo =
        Repository::discover(path).map_err(|e| format!("Failed to find git repository: {}", e))?;

    let repo_root_path = repo
        .workdir()
        .ok_or("Repository has no working directory")?
        .to_path_buf();

    let status_map = update_git_status_map(&repo_root_path)?;

    Ok((repo_root_path, status_map))
}

fn check_dvc_file(path: &Path) -> bool {
    if path.is_file() {
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
        let name = path
            .file_name()
            .unwrap_or_else(|| path.as_os_str())
            .to_string_lossy();
        let dvc_name = format!("{}.dvc", name);
        let dvc_path = path.join(dvc_name);
        dvc_path.exists()
    }
}

fn get_relative_path(path: &Path, repo_root: &Path) -> String {
    path.strip_prefix(repo_root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|_| path.to_string_lossy().replace('\\', "/"))
}

fn get_git_status_for_path(
    path: &Path,
    repo_root: &Path,
    git_status_map: &HashMap<String, String>,
    has_dvc_file: bool,
) -> String {
    let git_path = if has_dvc_file {
        if path.is_file() {
            let mut dvc_file = path.to_path_buf();
            dvc_file.set_extension(format!(
                "{}{}",
                path.extension()
                    .map(|e| e.to_string_lossy())
                    .unwrap_or_default(),
                ".dvc"
            ));
            dvc_file
        } else {
            let name = path
                .file_name()
                .unwrap_or_else(|| path.as_os_str())
                .to_string_lossy();
            let dvc_name = format!("{}.dvc", name);
            path.join(dvc_name)
        }
    } else {
        path.to_path_buf()
    };

    let relative_path = get_relative_path(&git_path, repo_root);
    git_status_map
        .get(&relative_path)
        .cloned()
        .unwrap_or_else(|| "untracked".to_string())
}

// Returns an ordered list of file entries inside a directory recursively, similar to list_files in gitbutler-fs
fn list_file_entries<P: AsRef<Path>>(
    dir_path: P,
    repo_root: &Path,
    git_status_map: &HashMap<String, String>,
    dvc_status_map: &HashMap<String, String>,
    ignore_prefixes: &[&str],
    recursive: bool,
) -> Result<Vec<FileEntry>, String> {
    let mut files = Vec::new();
    let dir_path = dir_path.as_ref();

    if !dir_path.exists() {
        return Ok(files);
    }

    for entry in WalkDir::new(dir_path).max_depth(if recursive { usize::MAX } else { 1 }) {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        // Skip .git directory
        if path.components().any(|c| c.as_os_str() == ".git") {
            continue;
        }

        // Skip hidden files and directories (including anything within hidden directories)
        if path.components().any(|component| {
            component
                .as_os_str()
                .to_str()
                .map(|s| s.starts_with('.'))
                .unwrap_or(false)
        }) {
            continue;
        }

        // Skip ignored directories
        if entry.file_type().is_dir() {
            let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if ignore_prefixes.contains(&dir_name) {
                continue;
            }
        }

        // Skip .dvc files themselves
        if path.extension().and_then(|e| e.to_str()) == Some("dvc") {
            continue;
        }

        // Skip symlinks to prevent infinite recursion
        if entry.file_type().is_symlink() {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to get metadata: {}", e))?;
        let has_dvc_file = check_dvc_file(path);

        // Get git status
        let mut git_status = get_git_status_for_path(path, repo_root, git_status_map, has_dvc_file);

        // Override with DVC status if file has DVC tracking
        if has_dvc_file {
            let relative_path = get_relative_path(path, repo_root);
            if let Some(dvc_status) = dvc_status_map.get(&relative_path) {
                git_status = dvc_status.clone();
            }
        }

        let relative_path = get_relative_path(path, repo_root);

        files.push(FileEntry {
            path: relative_path,
            size: metadata.len(),
            is_directory: entry.file_type().is_dir(),
            has_dvc_file,
            git_status,
        });
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(files)
}

#[tauri::command]
pub fn get_file_tree_structure(
    app_handle: tauri::AppHandle,
    path: &str,
) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(path);
    let (repo_root, git_status_map) = get_repo_git_status(path)?;
    let dvc_status_map = dvc::dvc_diff(&app_handle, path)?;

    // Define directories to ignore (similar to gitbutler-fs patterns)
    let ignore_prefixes = &["target", "node_modules", ".git", "dist", "build"];

    list_file_entries(
        path,
        &repo_root,
        &git_status_map,
        &dvc_status_map,
        ignore_prefixes,
        true, // recursive
    )
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

    // Read the file as binary
    let content = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Convert binary content to base64
    let base64_content = BASE64.encode(content);

    Ok(base64_content)
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

#[tauri::command]
pub fn get_files_status(
    repo_path: &str,
    file_paths: Vec<String>,
) -> Result<Vec<FileStatus>, String> {
    let path = Path::new(repo_path);
    let (repo_root, git_status_map) = get_repo_git_status(path)?;

    let mut statuses = Vec::new();
    for file_path in file_paths {
        let path = Path::new(&file_path);
        let mut has_dvc_file = false;
        let mut git_path = path.to_string_lossy().to_string();

        // First check if this is a .dvc file
        if file_path.ends_with(".dvc") {
            has_dvc_file = true;
        } else {
            // If not a .dvc file, check if a corresponding .dvc file exists
            let mut dvc_file = path.to_path_buf();
            dvc_file.set_extension(format!(
                "{}{}",
                path.extension()
                    .map(|e| e.to_string_lossy())
                    .unwrap_or_default(),
                ".dvc"
            ));
            has_dvc_file = dvc_file.exists();
            if has_dvc_file {
                // If .dvc file exists, use its path for git status
                git_path = dvc_file.to_string_lossy().to_string();
            }
        }

        // Get relative path from repo root for git status lookup
        let relative_path = Path::new(&git_path)
            .strip_prefix(&repo_root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| git_path.replace('\\', "/"));

        // Get git status
        let git_status = git_status_map
            .get(&relative_path)
            .cloned()
            .unwrap_or_else(|| "untracked".to_string());

        // Return status for the original file path (without .dvc extension)
        let original_path = if file_path.ends_with(".dvc") {
            file_path.strip_suffix(".dvc").unwrap().to_string()
        } else {
            file_path
        };

        statuses.push(FileStatus {
            path: original_path,
            git_status,
            has_dvc_file,
        });
    }

    Ok(statuses)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusEntry {
    pub path: String,
    pub status: String, // e.g., "untracked", "modified", "staged", "committed"
}
