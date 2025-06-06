use std::process::Command;
use tauri::command;

#[command]
pub fn init_dvc_project(path: &str) -> Result<String, String> {
    // First initialize git repository
    let git_init = Command::new("git")
        .arg("init")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to initialize git repository: {}", e))?;

    if !git_init.status.success() {
        return Err(format!(
            "Git init failed: {}",
            String::from_utf8_lossy(&git_init.stderr)
        ));
    }

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
