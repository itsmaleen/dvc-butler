use serde::Serialize;
use std::process::Command;
use tauri::command;

#[derive(Serialize)]
pub struct StagedFile {
    pub path: String,
    pub status: String,
}

#[command]
pub fn git_status(repo_path: String) -> Result<Vec<StagedFile>, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("status")
        .arg("--porcelain")
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut files = Vec::new();
    for line in stdout.lines() {
        if let Some((status, path)) = line.split_once(' ') {
            let status = status.trim();
            let path = path.trim();
            if status != "??" {
                files.push(StagedFile {
                    path: path.to_string(),
                    status: status.to_string(),
                });
            }
        }
    }
    Ok(files)
}
