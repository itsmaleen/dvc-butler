use anyhow::Result;
use git2::{BranchType, Repository, StatusOptions};
use serde::Serialize;
use std::path::Path;
use tauri::command;
use tracing::instrument;

#[derive(Debug, Serialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
    pub is_staged: bool,
    pub is_untracked: bool,
    pub is_modified: bool,
    pub is_deleted: bool,
    pub is_renamed: bool,
}

#[derive(Debug, Serialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GitStatus {
    pub files: Vec<GitFile>,
    pub current_branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub has_untracked: bool,
    pub has_staged: bool,
    pub has_unstaged: bool,
}

#[derive(Debug, Serialize)]
pub struct CommitResult {
    pub success: bool,
    pub message: String,
    pub commit_id: Option<String>,
}

/// Enhanced git status using git2 library for better performance and reliability
#[command]
#[instrument(skip(repo_path), err(Debug))]
pub fn git_status(repo_path: String) -> Result<GitStatus, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    // Get current branch
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let current_branch = head.shorthand().unwrap_or("HEAD").to_string();

    // Configure status options for comprehensive status
    let mut status_opts = StatusOptions::new();
    status_opts
        .include_untracked(true)
        .include_ignored(false)
        .include_unmodified(false)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo
        .statuses(Some(&mut status_opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let mut files = Vec::new();
    let mut has_untracked = false;
    let mut has_staged = false;
    let mut has_unstaged = false;

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("unknown").to_string();
        let status = entry.status();

        let is_staged =
            status.is_index_new() || status.is_index_modified() || status.is_index_deleted();
        let is_untracked = status.is_wt_new();
        let is_modified = status.is_wt_modified();
        let is_deleted = status.is_wt_deleted();
        let is_renamed = status.is_wt_renamed();

        if is_untracked {
            has_untracked = true;
        }
        if is_staged {
            has_staged = true;
        }
        if is_modified || is_deleted {
            has_unstaged = true;
        }

        let status_str = if is_untracked {
            "untracked".to_string()
        } else if is_staged {
            "staged".to_string()
        } else if is_modified {
            "modified".to_string()
        } else if is_deleted {
            "deleted".to_string()
        } else if is_renamed {
            "renamed".to_string()
        } else {
            "unknown".to_string()
        };

        files.push(GitFile {
            path,
            status: status_str,
            is_staged,
            is_untracked,
            is_modified,
            is_deleted,
            is_renamed,
        });
    }

    // Get ahead/behind information
    let (ahead, behind) = get_ahead_behind(&repo, &current_branch).unwrap_or((0, 0));

    Ok(GitStatus {
        files,
        current_branch,
        ahead,
        behind,
        has_untracked,
        has_staged,
        has_unstaged,
    })
}

/// Enhanced commit function with better error handling and validation
#[command]
#[instrument(skip(repo_path, summary, description), err(Debug))]
pub fn git_commit_and_push(
    repo_path: String,
    summary: String,
    description: String,
) -> Result<CommitResult, String> {
    if summary.trim().is_empty() {
        return Err("Commit summary cannot be empty".to_string());
    }

    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    // Check if there are staged changes
    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(false);
    let statuses = repo
        .statuses(Some(&mut status_opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let has_staged = statuses.iter().any(|entry| {
        let status = entry.status();
        status.is_index_new() || status.is_index_modified() || status.is_index_deleted()
    });

    if !has_staged {
        return Err("No staged changes to commit".to_string());
    }

    // Get the index and create a tree
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    let tree_id = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;

    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;

    // Get the current HEAD
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let parent = repo
        .find_commit(head.target().unwrap())
        .map_err(|e| format!("Failed to find parent commit: {}", e))?;

    // Create commit message
    let mut commit_msg = summary.trim().to_string();
    if !description.trim().is_empty() {
        commit_msg.push_str("\n\n");
        commit_msg.push_str(description.trim());
    }

    // Get author and committer signatures
    let signature = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;

    // Create the commit
    let commit_id = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            &commit_msg,
            &tree,
            &[&parent],
        )
        .map_err(|e| format!("Failed to create commit: {}", e))?;

    // Try to push (commented out as in original)
    // let push_result = push_to_remote(&repo).map_err(|e| format!("Push failed: {}", e))?;

    Ok(CommitResult {
        success: true,
        message: "Commit successful".to_string(),
        commit_id: Some(commit_id.to_string()),
    })
}

/// Enhanced pull function with better error handling
#[command]
#[instrument(skip(repo_path), err(Debug))]
pub fn git_pull(repo_path: String) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    // Get the current branch
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch_name = head.shorthand().ok_or("Failed to get branch name")?;

    // Find the branch
    let branch = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| format!("Failed to find branch: {}", e))?;

    // Get the upstream branch
    let upstream = branch
        .upstream()
        .map_err(|e| format!("Failed to get upstream: {}", e))?;

    let upstream_name = upstream
        .name()
        .map_err(|e| format!("Failed to get upstream name: {}", e))?
        .ok_or("No upstream name")?;

    // Fetch from remote
    let mut remote = repo
        .find_remote(upstream_name)
        .map_err(|e| format!("Failed to find remote: {}", e))?;

    remote
        .fetch(&[upstream_name], None, None)
        .map_err(|e| format!("Failed to fetch: {}", e))?;

    // Merge the fetched changes
    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| format!("Failed to find FETCH_HEAD: {}", e))?;

    let fetch_commit = repo
        .find_commit(fetch_head.target().unwrap())
        .map_err(|e| format!("Failed to find fetch commit: {}", e))?;

    // Check if we can fast-forward
    let head_commit = repo
        .find_commit(head.target().unwrap())
        .map_err(|e| format!("Failed to find head commit: {}", e))?;

    if head_commit.id() == fetch_commit.id() {
        return Ok("Already up to date".to_string());
    }

    // Perform the merge
    let mut index = repo
        .merge_commits(&head_commit, &fetch_commit, None)
        .map_err(|e| format!("Failed to merge: {}", e))?;

    if index.has_conflicts() {
        return Err("Merge conflicts detected".to_string());
    }

    let tree_id = index
        .write_tree_to(&repo)
        .map_err(|e| format!("Failed to write tree: {}", e))?;

    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;

    let signature = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;

    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        "Merge remote-tracking branch",
        &tree,
        &[&head_commit, &fetch_commit],
    )
    .map_err(|e| format!("Failed to commit merge: {}", e))?;

    Ok("Pull successful".to_string())
}

/// Enhanced branch listing with more information
#[command]
#[instrument(skip(repo_path), err(Debug))]
pub fn git_list_branches(repo_path: String) -> Result<Vec<GitBranch>, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let current_branch_name = head.shorthand().unwrap_or("HEAD").to_string();

    let mut branches = Vec::new();

    // Get local branches
    let local_branches = repo
        .branches(Some(BranchType::Local))
        .map_err(|e| format!("Failed to get local branches: {}", e))?;

    for branch_result in local_branches {
        let (branch, _) = branch_result.map_err(|e| format!("Failed to process branch: {}", e))?;

        let name = branch
            .name()
            .map_err(|e| format!("Failed to get branch name: {}", e))?
            .unwrap_or("unknown")
            .to_string();

        let is_current = name == current_branch_name;
        let upstream = branch
            .upstream()
            .ok()
            .and_then(|up| up.name().ok().flatten().map(|s| s.to_string()));

        branches.push(GitBranch {
            name,
            is_current,
            is_remote: false,
            upstream,
        });
    }

    // Get remote branches
    let remote_branches = repo
        .branches(Some(BranchType::Remote))
        .map_err(|e| format!("Failed to get remote branches: {}", e))?;

    for branch_result in remote_branches {
        let (branch, _) =
            branch_result.map_err(|e| format!("Failed to process remote branch: {}", e))?;

        let name = branch
            .name()
            .map_err(|e| format!("Failed to get remote branch name: {}", e))?
            .unwrap_or("unknown")
            .to_string();

        branches.push(GitBranch {
            name,
            is_current: false,
            is_remote: true,
            upstream: None,
        });
    }

    Ok(branches)
}

/// Enhanced checkout with better error handling
#[command]
#[instrument(skip(repo_path, branch), err(Debug))]
pub fn git_checkout(repo_path: String, branch: String) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;
    let branch_ref_name = format!("refs/heads/{}", branch);

    // Try to find the branch reference and get the tree OID
    let branch_tree_oid = if let Ok(branch_ref) = repo.find_reference(&branch_ref_name) {
        let tree_oid = branch_ref
            .peel_to_tree()
            .map_err(|e| format!("Failed to peel branch reference: {}", e))?;
        Some(tree_oid.id())
    } else {
        None
    };

    if let Some(tree_oid) = branch_tree_oid {
        let branch_obj = repo
            .find_tree(tree_oid)
            .map_err(|e| format!("Failed to find tree: {}", e))?;
        repo.checkout_tree(branch_obj.as_object(), None)
            .map_err(|e| format!("Failed to checkout tree: {}", e))?;
        repo.set_head(&branch_ref_name)
            .map_err(|e| format!("Failed to set HEAD: {}", e))?;
        Ok(format!("Checked out to branch {}", branch))
    } else {
        // Branch doesn't exist, create it
        let head = repo
            .head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;
        let head_commit = repo
            .find_commit(head.target().unwrap())
            .map_err(|e| format!("Failed to find HEAD commit: {}", e))?;
        let new_branch = repo
            .branch(&branch, &head_commit, false)
            .map_err(|e| format!("Failed to create branch: {}", e))?;
        let new_branch_ref_name = new_branch.get().name().unwrap().to_string();

        // Get the tree OID for the new branch
        let tree_oid = {
            let new_branch_ref = repo
                .find_reference(&new_branch_ref_name)
                .map_err(|e| format!("Failed to find new branch reference: {}", e))?;
            let t_oid = new_branch_ref
                .peel_to_tree()
                .map_err(|e| format!("Failed to peel new branch reference: {}", e))?;
            t_oid.id()
        };

        let new_branch_obj = repo
            .find_tree(tree_oid)
            .map_err(|e| format!("Failed to find new branch tree: {}", e))?;
        repo.checkout_tree(new_branch_obj.as_object(), None)
            .map_err(|e| format!("Failed to checkout new branch: {}", e))?;
        repo.set_head(&new_branch_ref_name)
            .map_err(|e| format!("Failed to set HEAD: {}", e))?;
        Ok(format!("Created and checked out to branch {}", branch))
    }
}

/// Enhanced stash function
#[command]
#[instrument(skip(repo_path), err(Debug))]
pub fn git_stash(repo_path: String) -> Result<String, String> {
    let mut repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let signature = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;

    let stash_message = "Stash created by fenn-app";

    let stash_id = repo
        .stash_save(&signature, stash_message, None)
        .map_err(|e| format!("Failed to stash: {}", e))?;

    Ok(format!("Stash created with id: {}", stash_id))
}

/// Get current branch using git2
#[command]
#[instrument(skip(repo_path), err(Debug))]
pub fn git_current_branch(repo_path: String) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch_name = head.shorthand().unwrap_or("HEAD").to_string();

    Ok(branch_name)
}

/// Enhanced branch switching
#[command]
#[instrument(skip(repo_path, branch), err(Debug))]
pub fn git_switch_branch(repo_path: String, branch: String) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    // Find the branch reference
    let branch_ref_name = format!("refs/heads/{}", branch);
    let branch_ref = repo
        .find_reference(&branch_ref_name)
        .map_err(|e| format!("Branch '{}' not found: {}", branch, e))?;

    // Get the tree object from the reference
    let branch_obj = branch_ref
        .peel_to_tree()
        .map_err(|e| format!("Failed to peel reference: {}", e))?;

    // Checkout the branch
    repo.checkout_tree(branch_obj.as_object(), None)
        .map_err(|e| format!("Failed to checkout tree: {}", e))?;

    // Set HEAD to the branch
    repo.set_head(branch_ref.name().unwrap())
        .map_err(|e| format!("Failed to set HEAD: {}", e))?;

    Ok(format!("Switched to branch {}", branch))
}

/// New function: Get detailed diff information
#[command]
#[instrument(skip(repo_path, file_path), err(Debug))]
pub fn git_file_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let head_commit = repo
        .find_commit(head.target().unwrap())
        .map_err(|e| format!("Failed to find HEAD commit: {}", e))?;

    let head_tree = head_commit
        .tree()
        .map_err(|e| format!("Failed to get HEAD tree: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    let index_tree = index
        .write_tree_to(&repo)
        .map_err(|e| format!("Failed to write index tree: {}", e))?;

    let index_tree = repo
        .find_tree(index_tree)
        .map_err(|e| format!("Failed to find index tree: {}", e))?;

    let mut diff = repo
        .diff_tree_to_tree(Some(&head_tree), Some(&index_tree), None)
        .map_err(|e| format!("Failed to create diff: {}", e))?;

    let mut diff_output = String::new();
    diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        if let Some(path) = delta.new_file().path() {
            if path.to_string_lossy() == file_path {
                diff_output.push_str(&String::from_utf8_lossy(line.content()));
            }
        }
        true
    })
    .map_err(|e| format!("Failed to print diff: {}", e))?;

    Ok(diff_output)
}

/// Helper function to get ahead/behind information
fn get_ahead_behind(repo: &Repository, branch_name: &str) -> Result<(i32, i32), git2::Error> {
    let branch = repo.find_branch(branch_name, BranchType::Local)?;

    if let Ok(upstream) = branch.upstream() {
        let upstream_name = upstream.name()?.unwrap_or("origin/main");
        let remote = repo.find_remote(upstream_name)?;

        // Get the remote branch reference
        let remote_ref = format!("refs/remotes/{}/{}", remote.name().unwrap(), branch_name);
        if let Ok(remote_ref) = repo.find_reference(&remote_ref) {
            let local_oid = branch.get().target().unwrap();
            let remote_oid = remote_ref.target().unwrap();

            let (ahead, behind) = repo.graph_ahead_behind(local_oid, remote_oid)?;
            return Ok((ahead as i32, behind as i32));
        }
    }

    Ok((0, 0))
}

/// New function: Stage specific files
#[command]
#[instrument(skip(repo_path, files), err(Debug))]
pub fn git_add_files(repo_path: String, files: Vec<String>) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    let files_count = files.len();
    for file in &files {
        index
            .add_path(Path::new(file))
            .map_err(|e| format!("Failed to add file {}: {}", file, e))?;
    }

    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;

    Ok(format!("Added {} files to staging area", files_count))
}

/// New function: Unstage specific files
#[command]
#[instrument(skip(repo_path, files), err(Debug))]
pub fn git_reset_files(repo_path: String, files: Vec<String>) -> Result<String, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    let files_count = files.len();
    for file in &files {
        index
            .remove_path(Path::new(file))
            .map_err(|e| format!("Failed to remove file {}: {}", file, e))?;
    }

    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;

    Ok(format!("Removed {} files from staging area", files_count))
}
