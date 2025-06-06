use serde::{Deserialize, Serialize};
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
