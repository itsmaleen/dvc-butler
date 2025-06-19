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
        // Porcelain format: XY <SP>+ path (or paths for rename/copy)
        if line.len() >= 3 {
            let status = &line[0..2];
            let path = line[3..].trim_start().trim_matches('"');
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

#[command]
pub fn git_commit_and_push(
    repo_path: String,
    summary: String,
    description: String,
) -> Result<String, String> {
    if summary.trim().is_empty() {
        return Err("Commit summary cannot be empty".to_string());
    }
    let mut commit_msg = summary.trim().to_string();
    if !description.trim().is_empty() {
        commit_msg.push_str("\n");
        commit_msg.push_str(description.trim());
    }

    // Commit
    let commit_output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("commit")
        .arg("-m")
        .arg(&commit_msg)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;
    if !commit_output.status.success() {
        return Err(String::from_utf8_lossy(&commit_output.stderr).to_string());
    }

    // Push
    // let push_output = Command::new("git")
    //     .arg("-C")
    //     .arg(&repo_path)
    //     .arg("push")
    //     .output()
    //     .map_err(|e| format!("Failed to run git push: {}", e))?;
    // if !push_output.status.success() {
    //     return Err(String::from_utf8_lossy(&push_output.stderr).to_string());
    // }

    Ok("Commit and push successful".to_string())
}

#[command]
pub fn git_pull(repo_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("pull")
        .output()
        .map_err(|e| format!("Failed to run git pull: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok("Pull successful".to_string())
}

#[command]
pub fn git_checkout(repo_path: String, branch: String) -> Result<String, String> {
    // Try to checkout, if branch doesn't exist, create it
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("checkout")
        .arg(&branch)
        .output()
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;
    if output.status.success() {
        return Ok(format!("Checked out to branch {}", branch));
    }
    // If checkout failed, try to create branch
    let create_output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("checkout")
        .arg("-b")
        .arg(&branch)
        .output()
        .map_err(|e| format!("Failed to create branch: {}", e))?;
    if !create_output.status.success() {
        return Err(String::from_utf8_lossy(&create_output.stderr).to_string());
    }
    Ok(format!("Created and checked out to branch {}", branch))
}

#[command]
pub fn git_stash(repo_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("stash")
        .output()
        .map_err(|e| format!("Failed to run git stash: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok("Stash successful".to_string())
}

#[command]
pub fn git_list_branches(repo_path: String) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("branch")
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let branches = stdout
        .lines()
        .map(|line| line.trim_start_matches('*').trim().to_string())
        .collect();
    Ok(branches)
}

#[command]
pub fn git_current_branch(repo_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .output()
        .map_err(|e| format!("Failed to get current branch: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(branch)
}

#[command]
pub fn git_switch_branch(repo_path: String, branch: String) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_path)
        .arg("checkout")
        .arg(&branch)
        .output()
        .map_err(|e| format!("Failed to switch branch: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(format!("Switched to branch {}", branch))
}
