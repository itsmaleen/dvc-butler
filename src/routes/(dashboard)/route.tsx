import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getCurrentProject,
  getProjects,
  setCurrentProject,
  getLocalPath,
} from "@/lib/db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GalleryVerticalEnd } from "lucide-react";
import {
  createRootRoute,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export const Route = createRootRoute({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      path: search.path as string | undefined,
    };
  },
  component: DashboardRootComponent,
});

function DashboardRootComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { path } = Route.useSearch() as { path: string | undefined };

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
  if (projects.length === 0) {
    console.log("no projects");
    return navigate({ to: "/onboarding" });
  }

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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Files</BreadcrumbLink>
                </BreadcrumbItem>
                {path && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{path}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
