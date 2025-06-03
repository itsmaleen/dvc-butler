-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create storage_configs table
CREATE TABLE IF NOT EXISTS storage_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    storage_type TEXT NOT NULL CHECK (storage_type IN ('s3', 'gcs', 'azure', 'local')),
    bucket_name TEXT,
    container_name TEXT,
    access_key TEXT,
    secret_key TEXT,
    connection_string TEXT,
    project_id_cloud TEXT,
    key_file_path TEXT,
    local_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create data_files table for tracking DVC data files
CREATE TABLE IF NOT EXISTS data_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    dvc_path TEXT NOT NULL,
    last_modified TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, file_path)
);

-- Create data_versions table for tracking DVC versions
CREATE TABLE IF NOT EXISTS data_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    version_hash TEXT NOT NULL,
    version_name TEXT,
    commit_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, version_hash)
);

-- Create data_version_files table for tracking which files are in each version
CREATE TABLE IF NOT EXISTS data_version_files (
    version_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (version_id, file_id),
    FOREIGN KEY (version_id) REFERENCES data_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES data_files(id) ON DELETE CASCADE
);

-- Create triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_storage_configs_timestamp 
AFTER UPDATE ON storage_configs
BEGIN
    UPDATE storage_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_data_files_timestamp 
AFTER UPDATE ON data_files
BEGIN
    UPDATE data_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END; 