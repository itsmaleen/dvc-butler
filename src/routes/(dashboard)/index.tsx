import { FileTree, FileTreeHandle } from "@/components/file-tree";
import { CommandCenter } from "@/components/command-center";
import { getCurrentProject, getLocalPath } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { TopBar } from "@/components/top-bar";
import { PushSidebar } from "@/components/push-sidebar";

// Type definitions for the new git2 response structure
interface GitFile {
  path: string;
  status: string;
  is_staged: boolean;
  is_untracked: boolean;
  is_modified: boolean;
  is_deleted: boolean;
  is_renamed: boolean;
}

interface GitStatus {
  files: GitFile[];
  current_branch: string;
  ahead: number;
  behind: number;
  has_untracked: boolean;
  has_staged: boolean;
  has_unstaged: boolean;
}

export const Route = createFileRoute("/(dashboard)/")({
  component: Index,
});

function Index() {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pushSidebarOpen, setPushSidebarOpen] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const fileTreeRef = useRef<FileTreeHandle>(null);

  const { data: activeProjectId } = useQuery({
    queryKey: ["activeProjectId"],
    queryFn: async () => {
      const currentProject = await getCurrentProject();
      return currentProject?.id;
    },
  });

  const { data: localPath, isPending: isLocalPathPending } = useQuery({
    queryKey: ["localPath", activeProjectId],
    queryFn: async () => {
      const localPath = await getLocalPath(activeProjectId ?? 0);
      return localPath;
    },
  });

  useEffect(() => {
    if (localPath) {
      invoke<GitStatus>("git_status", {
        repoPath: localPath,
      })
        .then(setGitStatus)
        .catch(() => setGitStatus(null));
    }
  }, [localPath]);

  useEffect(() => {
    console.log("selectedFiles", selectedFiles);
  }, [selectedFiles]);

  // Extract staged files from the new structure
  const stagedFiles = gitStatus?.files.filter((file) => file.is_staged) || [];

  const handleCommandAction = async (action: string) => {
    if (!localPath) return;

    switch (action) {
      case "clear":
        setSelectedFiles(new Set());
        await invoke("clear_selected_files");
        break;
      case "add":
        try {
          const leafFiles = filterLeafPaths(selectedFiles);
          console.log("leafFiles", leafFiles);
          for (const file of leafFiles) {
            await invoke("add_dvc_file", { path: localPath, file });
            toast.success(`Added and staged ${file} (DVC + git add)`);
          }

          // Update the git status
          const newGitStatus = await invoke<GitStatus>("git_status", {
            repoPath: localPath,
          });

          setGitStatus(newGitStatus);

          // Update the file tree status for the affected files
          if (fileTreeRef.current) {
            await fileTreeRef.current.updateFileStatuses(
              Array.from(selectedFiles)
            );
          }
        } catch (error) {
          alert(error);
          toast.error("Failed to add files", {
            description:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
        break;
      case "checkout":
        try {
          for (const file of selectedFiles) {
            await invoke("checkout_file", {
              path: localPath,
              file,
            });
            toast.success(`Checked out ${file}`);
          }
        } catch (error) {
          console.error(error);
          toast.error("Failed to checkout files", {
            description:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
        break;
    }
  };

  return (
    <>
      <TopBar
        repoPath={localPath ?? ""}
        stagedFiles={stagedFiles.map((f) => f.path)}
        onPush={() => setPushSidebarOpen(true)}
      />
      <PushSidebar
        open={pushSidebarOpen}
        onOpenChange={setPushSidebarOpen}
        stagedFiles={stagedFiles.map((f) => f.path)}
        repoPath={localPath ?? ""}
        fileTreeRef={fileTreeRef}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {isLocalPathPending ? (
          <div>Loading...</div>
        ) : (
          localPath && (
            <FileTree
              ref={fileTreeRef}
              initialPath={localPath}
              onSelectionChange={setSelectedFiles}
              selectedFiles={selectedFiles}
            />
          )
        )}
      </div>
      <CommandCenter
        selectedFiles={Array.from(selectedFiles)}
        onAction={handleCommandAction}
        setSelectedFiles={setSelectedFiles}
      />
    </>
  );
}

function filterLeafPaths(selectedFiles: Set<string>): string[] {
  const paths = Array.from(selectedFiles).sort();
  const result: string[] = [];
  for (let i = 0; i < paths.length; i++) {
    const isPrefix = paths.some(
      (other, j) => j !== i && other.startsWith(paths[i] + "/")
    );
    if (!isPrefix) {
      result.push(paths[i]);
    }
  }
  return result;
}
