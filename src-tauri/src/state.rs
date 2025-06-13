use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct SelectedFiles {
    pub paths: Vec<String>,
}

impl SelectedFiles {
    pub fn new() -> Self {
        Self { paths: Vec::new() }
    }

    pub fn add_path(&mut self, path: String) {
        if !self.paths.contains(&path) {
            self.paths.push(path);
        }
    }

    pub fn remove_path(&mut self, path: &str) {
        self.paths.retain(|p| p != path);
    }

    pub fn clear(&mut self) {
        self.paths.clear();
    }
}

pub type SelectedFilesState = Mutex<SelectedFiles>;
