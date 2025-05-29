import Database from "@tauri-apps/plugin-sql";

export interface Project {
  id?: number;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface StorageConfig {
  id?: number;
  project_id: number;
  storage_type: string;
  bucket_name?: string;
  container_name?: string;
  access_key?: string;
  secret_key?: string;
  connection_string?: string;
  project_id_cloud?: string;
  key_file_path?: string;
  local_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DvcConfig {
  initialize: boolean;
}

export interface LocalDataConfig {
  folderPath: string;
  folderType: "existing" | "new";
}

export interface RemoteStorageConfig {
  storageType: "s3" | "gcs" | "azure" | "local";
  bucketName?: string;
  containerName?: string;
  accessKey?: string;
  secretKey?: string;
  connectionString?: string;
  projectIdCloud?: string;
  keyFilePath?: string;
  localPath?: string;
}

export async function createProject(
  name: string,
  description: string
): Promise<number | undefined> {
  const db = new Database("sqlite:fenn.db");
  const result = await db.execute(
    "INSERT INTO projects (name, description) VALUES (?, ?)",
    [name, description]
  );
  return result.lastInsertId;
}

export async function createStorageConfig(
  project_id: number,
  storage_type: string,
  bucket_name?: string,
  container_name?: string,
  access_key?: string,
  secret_key?: string,
  connection_string?: string,
  project_id_cloud?: string,
  key_file_path?: string,
  local_path?: string
): Promise<number | undefined> {
  const db = new Database("sqlite:fenn.db");
  const result = await db.execute(
    "INSERT INTO storage_configs (project_id, storage_type, bucket_name, container_name, access_key, secret_key, connection_string, project_id_cloud, key_file_path, local_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      project_id,
      storage_type,
      bucket_name,
      container_name,
      access_key,
      secret_key,
      connection_string,
      project_id_cloud,
      key_file_path,
      local_path,
    ]
  );
  return result.lastInsertId;
}

export async function saveOnboardingData(
  projectInfo: { name: string; description: string },
  remoteStorageConfig: RemoteStorageConfig
): Promise<{ projectId: number; storageConfigId: number }> {
  const db = new Database("sqlite:fenn.db");

  // Start a transaction
  await db.execute("BEGIN TRANSACTION");

  try {
    // Create project
    const projectResult = await db.execute(
      "INSERT INTO projects (name, description) VALUES (?, ?)",
      [projectInfo.name, projectInfo.description]
    );
    const projectId = projectResult.lastInsertId;

    if (!projectId) {
      throw new Error("Failed to create project");
    }

    // Create storage config
    const storageConfigResult = await db.execute(
      "INSERT INTO storage_configs (project_id, storage_type, bucket_name, container_name, access_key, secret_key, connection_string, project_id_cloud, key_file_path, local_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        projectId,
        remoteStorageConfig.storageType,
        remoteStorageConfig.bucketName,
        remoteStorageConfig.containerName,
        remoteStorageConfig.accessKey,
        remoteStorageConfig.secretKey,
        remoteStorageConfig.connectionString,
        remoteStorageConfig.projectIdCloud,
        remoteStorageConfig.keyFilePath,
        remoteStorageConfig.localPath,
      ]
    );
    const storageConfigId = storageConfigResult.lastInsertId;

    if (!storageConfigId) {
      throw new Error("Failed to create storage config");
    }

    // Commit the transaction
    await db.execute("COMMIT");

    return { projectId, storageConfigId };
  } catch (error) {
    // Rollback the transaction on error
    await db.execute("ROLLBACK");
    throw error;
  }
}

export async function getProject(projectId: number): Promise<Project | null> {
  const db = new Database("sqlite:fenn.db");
  const result = await db.select<Project[]>(
    "SELECT * FROM projects WHERE id = ?",
    [projectId]
  );
  return result[0] || null;
}

export async function getStorageConfig(
  projectId: number
): Promise<StorageConfig | null> {
  const db = new Database("sqlite:fenn.db");
  const result = await db.select<StorageConfig[]>(
    "SELECT * FROM storage_configs WHERE project_id = ?",
    [projectId]
  );
  return result[0] || null;
}
