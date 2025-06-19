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

export const Route = createFileRoute("/(dashboard)/")({
  component: Index,
});

function Index() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [pushSidebarOpen, setPushSidebarOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<
    { path: string; status: string }[]
  >([]);
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
    invoke<{ path: string; status: string }[]>("git_status", {
      repoPath: localPath,
    })
      .then(setStagedFiles)
      .catch(() => setStagedFiles([]));
  }, [localPath]);

  const handleCommandAction = async (action: string) => {
    if (!localPath) return;

    switch (action) {
      case "clear":
        setSelectedFiles([]);
        await invoke("clear_selected_files");
        break;
      case "add":
        try {
          for (const file of selectedFiles) {
            await invoke("add_dvc_file", {
              path: localPath,
              file,
            });
            toast.success(`Added and staged ${file} (DVC + git add)`);
          }

          // Update the staged files lists
          const [newGitStatus] = await Promise.all([
            invoke<{ path: string; status: string }[]>("git_status", {
              repoPath: localPath,
            }),
          ]);

          setStagedFiles(newGitStatus);

          // Update the file tree status for the affected files
          if (fileTreeRef.current) {
            await fileTreeRef.current.updateFileStatuses(selectedFiles);
          }
        } catch (error) {
          console.error(error);
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
            />
          )
        )}
      </div>
      <CommandCenter
        selectedFiles={selectedFiles}
        onAction={handleCommandAction}
      />
    </>
  );
}
