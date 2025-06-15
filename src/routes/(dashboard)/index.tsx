import { FileTree } from "@/components/file-tree";
import { CommandCenter } from "@/components/command-center";
import { getCurrentProject, getLocalPath } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  const [dvcStagedFiles, setDvcStagedFiles] = useState<
    { path: string; status: string }[]
  >([]);

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
    invoke<{ path: string; status: string }[]>("dvc_diff", {
      path: localPath,
    })
      .then(setDvcStagedFiles)
      .catch(() => setDvcStagedFiles([]));
  }, [localPath]);

  const handleCommandAction = async (action: string) => {
    switch (action) {
      case "clear":
        setSelectedFiles([]);
        await invoke("clear_selected_files");
        break;
      case "add":
        for (const file of selectedFiles) {
          const result = await invoke("add_dvc_file", {
            path: localPath,
            file,
          });
          console.log(result);
          toast.success(`Added and staged ${file} (DVC + git add)`);
        }
        break;
    }
  };
  return (
    <>
      <TopBar
        repoPath={localPath ?? ""}
        onPush={() => setPushSidebarOpen(true)}
      />
      <PushSidebar
        open={pushSidebarOpen}
        onOpenChange={setPushSidebarOpen}
        stagedFiles={stagedFiles.map((f) => f.path)}
        repoPath={localPath ?? ""}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {isLocalPathPending ? (
          <div>Loading...</div>
        ) : (
          localPath && (
            <FileTree
              initialPath={localPath}
              onSelectionChange={setSelectedFiles}
              dvcStagedFiles={dvcStagedFiles}
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
