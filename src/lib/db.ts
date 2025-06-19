import { DvcConfig } from "@/components/initialize-dvc-step";
import { LocalDataConfig } from "@/components/local-data-step";
import { ProjectInfo } from "@/components/project-info-step";
import { RemoteStorageConfig } from "@/components/remote-storage-step";
import Database from "@tauri-apps/plugin-sql";

type Project = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type StorageConfig = {
  id: number;
  projectId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type DataFile = {
  id: number;
  projectId: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
};

type DataVersion = {
  id: number;
  projectId: number;
  versionHash: string;
  versionName: string;
  commitMessage: string;
  createdAt: Date;
};

type DataVersionFile = {
  versionId: number;
  fileId: number;
  createdAt: Date;
};

type CurrentProject = {
  project_id: number;
  createdAt: Date;
};

export type { Project, StorageConfig, DataFile, DataVersion, DataVersionFile };

export async function createProject(
  projectInfo: ProjectInfo,
  dvcConfig: DvcConfig,
  localDataConfig: LocalDataConfig,
  remoteStorageConfig: RemoteStorageConfig
) {
  const db = await Database.load("sqlite:fenn.db");

  // setup transaction to create project, storage config, data file, and data version
  const projectQuery = await db.execute(
    `INSERT INTO projects (name, description) VALUES (?, ?) RETURNING id`,
    [projectInfo.name, projectInfo.description]
  );

  const projectId = projectQuery.lastInsertId;

  // Insert storage config based on the storage type
  const storageType = remoteStorageConfig.storageType;

  if (storageType === "local") {
    await db.execute(
      `INSERT INTO storage_configs (
        project_id, storage_type, local_path
      ) VALUES (?, ?, ?) RETURNING id`,
      [projectId, storageType, remoteStorageConfig.localPath]
    );
  } else if (storageType !== "none") {
    // Handle cloud storage configs
    await db.execute(
      `INSERT INTO storage_configs (
        project_id, storage_type, bucket_name, access_key, secret_key,
        connection_string, project_id_cloud, key_file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        projectId,
        storageType,
        remoteStorageConfig.bucketName,
        remoteStorageConfig.accessKey,
        remoteStorageConfig.secretKey,
        remoteStorageConfig.connectionString,
        remoteStorageConfig.projectId,
        remoteStorageConfig.keyFilePath,
      ]
    );
  }

  // Only create data files and versions if DVC is initialized
  if (dvcConfig.initialize) {
    // Insert data file
    const dataFileQuery = await db.execute(
      `INSERT INTO data_files (
        project_id, file_path, file_hash, file_size, dvc_path, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        projectId,
        localDataConfig.folderPath,
        "initial", // Initial hash for new files
        0, // Initial size for new files
        localDataConfig.folderPath, // Using folder path as initial DVC path
        new Date().toISOString(),
      ]
    );

    const fileId = dataFileQuery.lastInsertId;

    // Insert initial data version
    const dataVersionQuery = await db.execute(
      `INSERT INTO data_versions (
        project_id, version_hash, version_name, commit_message
      ) VALUES (?, ?, ?, ?) RETURNING id`,
      [
        projectId,
        "initial", // Initial version hash
        "initial",
        "Initial version",
      ]
    );

    const versionId = dataVersionQuery.lastInsertId;

    // Link file to version
    await db.execute(
      `INSERT INTO data_version_files (version_id, file_id) VALUES (?, ?)`,
      [versionId, fileId]
    );
  }

  return {
    projectId,
  };
}

export async function getProjects() {
  const db = await Database.load("sqlite:fenn.db");

  const projects = await db.select<Project[]>("SELECT * FROM projects");

  return projects;
}

export async function getCurrentProject() {
  const db = await Database.load("sqlite:fenn.db");

  const projects = await db.select<Project[]>("SELECT * FROM projects");

  if (projects.length === 0) {
    return null;
  }

  const currentProject = await db
    .select<CurrentProject[]>(
      "SELECT * FROM current_project ORDER BY created_at DESC LIMIT 1"
    )
    .catch((error) => {
      console.error(error);
      return [];
    });

  if (currentProject.length === 0) {
    //   Set first project as current
    await setCurrentProject(projects[0].id)
      .then(() => {
        console.log("Current project set");
      })
      .catch((error) => {
        console.error(error);
      });

    return projects[0];
  }

  const project = projects.find(
    (project) => project.id === currentProject[0].project_id
  );

  return project;
}

export async function setCurrentProject(projectId: number) {
  const db = await Database.load("sqlite:fenn.db");

  const now = new Date().toISOString();

  await db.execute(
    "INSERT OR REPLACE INTO current_project (project_id, created_at) VALUES (?, ?)",
    [projectId, now]
  );
}

export async function deleteProject(projectId: number) {
  const db = await Database.load("sqlite:fenn.db");

  await db.execute("DELETE FROM projects WHERE id = ?", [projectId]);

  // If this was the current project, clear the current project
  const currentProject = await db.select<CurrentProject[]>(
    "SELECT * FROM current_project WHERE project_id = ?",
    [projectId]
  );

  if (currentProject.length > 0) {
    await db.execute("DELETE FROM current_project WHERE project_id = ?", [
      projectId,
    ]);
  }
}

export async function getLocalPath(projectId: number) {
  const db = await Database.load("sqlite:fenn.db");

  const localPath = await db
    .select<{ file_path: string }[]>(
      "SELECT file_path FROM data_files WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
      [projectId]
    )
    .then((data) => {
      if (data.length > 0) {
        return data[0].file_path;
      }
      return null;
    })
    .catch((error) => {
      console.error(error);
      return null;
    });

  return localPath;
}
