import { AppSidebar } from "@/components/app-sidebar";
import { FileTree } from "@/components/file-tree";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getCurrentProject,
  getLocalPath,
  getProjects,
  setCurrentProject,
} from "@/lib/db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GalleryVerticalEnd, Loader2 } from "lucide-react";

export const Route = createFileRoute("/(dashboard)/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate({ from: "/" });
  const queryClient = useQueryClient();

  const {
    isPending,
    error,
    data: projects,
    isFetching,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projects = await getProjects();

      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        logo: GalleryVerticalEnd,
      }));
    },
  });

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

  const setCurrentProjectMutation = useMutation({
    mutationFn: (projectId: number) => setCurrentProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeProjectId"] });
      queryClient.invalidateQueries({
        queryKey: ["localPath", activeProjectId],
      });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  if (isPending) return "Loading...";
  if (error) return "An error has occurred: " + error.message;
  if (projects.length === 0) return navigate({ to: "/onboarding" });

  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProject={(projectId) => {
          setCurrentProjectMutation.mutate(projectId);
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
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
      </SidebarInset>
    </SidebarProvider>
  );
}
