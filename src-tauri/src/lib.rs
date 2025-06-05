use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Debug, Serialize, Deserialize)]
struct FileNode {
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
fn get_file_tree_structure(path: &str) -> Result<FileNode, String> {
    get_file_tree(Path::new(path)).map_err(|e| e.to_string())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("migrations/001_initial_schema.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:fenn.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, get_file_tree_structure])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
