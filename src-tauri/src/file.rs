use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;

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
    let path = Path::new(path);

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
