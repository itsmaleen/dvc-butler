use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
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

fn parse_git_status(x: char, y: char) -> String {
    match (x, y) {
        ('?', '?') => "untracked",        // Untracked files
        ('A', ' ') => "staged",           // Added to staging
        ('M', ' ') => "staged",           // Modified and staged
        ('D', ' ') => "staged",           // Deleted and staged
        ('R', ' ') => "staged",           // Renamed and staged
        ('C', ' ') => "staged",           // Copied and staged
        (' ', 'M') => "modified",         // Modified but not staged
        (' ', 'D') => "deleted",          // Deleted but not staged
        ('M', 'M') => "partially_staged", // Modified, partially staged
        ('A', 'M') => "partially_staged", // Added and modified
        ('U', 'U') => "conflict",         // Unmerged, both modified
        ('D', 'D') => "conflict",         // Unmerged, both deleted
        ('A', 'A') => "conflict",         // Unmerged, both added
        ('U', 'D') => "conflict",         // Unmerged, deleted by them
        ('D', 'U') => "conflict",         // Unmerged, deleted by us
        _ => "other",
    }
    .to_string()
}

fn update_git_status_map(repo_root: &Path) -> Result<HashMap<String, String>, String> {
    let mut status_map = HashMap::new();

    // Get list of all tracked files that are committed and pushed
    let tracked_files_output = std::process::Command::new("git")
        .args(["ls-tree", "--full-tree", "-r", "--name-only", "HEAD"])
        .current_dir(repo_root)
        .output()
        .map_err(|e| format!("Failed to execute git ls-tree: {}", e))?;

    if !tracked_files_output.status.success() {
        return Err("Git ls-tree command failed".to_string());
    }

    let tracked_files: Vec<String> = String::from_utf8_lossy(&tracked_files_output.stdout)
        .lines()
        .map(|line| {
            // Remove quotes and normalize path
            let path = line.trim().trim_matches('"').to_string();
            Path::new(&path).to_string_lossy().replace('\\', "/")
        })
        .collect();

    // First, mark all tracked files in HEAD as pushed
    for file in tracked_files {
        status_map.insert(file, "pushed".to_string());
    }

    // Get git status for the entire repository
    let output = std::process::Command::new("git")
        .arg("status")
        .arg("--porcelain")
        .current_dir(repo_root)
        .output()
        .map_err(|e| format!("Failed to execute git status: {}", e))?;

    if !output.status.success() {
        return Err("Git status command failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.len() < 3 {
            continue;
        }
        let x = trimmed.chars().nth(0).unwrap();
        let y = trimmed.chars().nth(1).unwrap();
        let file_path = trimmed.chars().skip(3).collect::<String>();

        // Remove quotes and normalize path
        let normalized_path = Path::new(file_path.trim_matches('"'))
            .to_string_lossy()
            .replace('\\', "/");

        status_map.insert(normalized_path, parse_git_status(x, y));
    }

    Ok(status_map)
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
    let status_map = update_git_status_map(&repo_root_path)?;

    Ok((repo_root_path, status_map))
}

fn check_dvc_file(path: &Path, repo_root: &Path) -> bool {
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
            println!("Skipping hidden file or directory: {}", path.display());
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
        let has_dvc_file = check_dvc_file(path, repo_root);

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

    // println!("files: {:?}", files);
    println!("files.len(): {}", files.len());

    Ok(files)
}

#[tauri::command]
pub fn get_file_tree_structure(path: &str) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(path);
    let (repo_root, git_status_map) = get_repo_git_status(path)?;
    let dvc_status_map = dvc::dvc_diff(path)?;

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

    println!("path.display(): {}", path.display());

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
    println!(
        "\n\n\nget_files_status called with repo_path: {}",
        repo_path
    );
    let path = Path::new(repo_path);
    let (repo_root, git_status_map) = get_repo_git_status(path)?;

    let mut statuses = Vec::new();
    for file_path in file_paths {
        println!("file_path: {}", file_path);
        let path = Path::new(&file_path);
        println!("path: {}", path.display());
        let mut has_dvc_file = false;
        let mut git_path = path.to_string_lossy().to_string();
        println!("git_path: {}", git_path);

        // First check if this is a .dvc file
        if file_path.ends_with(".dvc") {
            println!("File is a .dvc file");
            has_dvc_file = true;
        } else {
            println!("File is not a .dvc file, checking for corresponding .dvc file");
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
            println!("Checking for .dvc file at: {}", dvc_file.display());
            println!("DVC file exists: {}", has_dvc_file);
            if has_dvc_file {
                // If .dvc file exists, use its path for git status
                git_path = dvc_file.to_string_lossy().to_string();
                println!("Using .dvc file path for git status: {}", git_path);
            }
        }

        // Get relative path from repo root for git status lookup
        let relative_path = Path::new(&git_path)
            .strip_prefix(&repo_root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| git_path.replace('\\', "/"));
        println!("Relative path for git status lookup: {}", relative_path);

        // Get git status
        let git_status = git_status_map
            .get(&relative_path)
            .cloned()
            .unwrap_or_else(|| "untracked".to_string());
        println!("Git status found: {}", git_status);

        // Return status for the original file path (without .dvc extension)
        let original_path = if file_path.ends_with(".dvc") {
            file_path.strip_suffix(".dvc").unwrap().to_string()
        } else {
            file_path
        };
        println!("Returning status for path: {}", original_path);
        println!("has_dvc_file: {}", has_dvc_file);
        println!("git_status: {}", git_status);

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
