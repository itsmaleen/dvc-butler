use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Mutex;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct SelectedFiles {
    pub paths: HashSet<String>,
}

impl SelectedFiles {
    pub fn new() -> Self {
        Self {
            paths: HashSet::new(),
        }
    }

    pub fn add_path(&mut self, path: String) {
        self.paths.insert(path);
    }

    pub fn remove_path(&mut self, path: &str) {
        self.paths.remove(path);
    }

    pub fn clear(&mut self) {
        self.paths.clear();
    }
}

pub type SelectedFilesState = Mutex<SelectedFiles>;
