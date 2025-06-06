import { FileTree } from "@/components/file-tree";
import { getCurrentProject, getLocalPath } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(dashboard)/")({
  component: Index,
});

function Index() {
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
      console.log("activeProjectId");
      const localPath = await getLocalPath(activeProjectId ?? 0);
      console.log("local path");
      console.log(localPath);
      return localPath;
    },
  });

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {isLocalPathPending ? (
          // <div className="flex h-full w-full items-center justify-center">
          //   <Loader2 className="h-4 w-4 animate-spin" />
          // </div>
          <div>Loading...</div>
        ) : (
          localPath && <FileTree initialPath={localPath} />
        )}
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    </>
  );
}
