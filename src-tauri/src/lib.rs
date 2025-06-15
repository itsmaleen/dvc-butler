use tauri_plugin_sql::{Migration, MigrationKind};

mod dvc;
mod file;
mod git;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("migrations/001_initial_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_current_project_table",
            sql: include_str!("migrations/002_current_project_state.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:fenn.db", migrations)
                .build(),
        )
        .manage(state::SelectedFilesState::new(state::SelectedFiles::new()))
        .invoke_handler(tauri::generate_handler![
            file::get_file_tree_structure,
            file::get_file_binary,
            file::get_relative_path,
            dvc::init_dvc_project,
            file::add_selected_file,
            file::remove_selected_file,
            file::get_selected_files,
            file::clear_selected_files,
            dvc::add_dvc_file,
            git::git_status,
            git::git_commit_and_push,
            git::git_pull,
            git::git_checkout,
            git::git_stash,
            git::git_list_branches,
            git::git_current_branch,
            git::git_switch_branch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
