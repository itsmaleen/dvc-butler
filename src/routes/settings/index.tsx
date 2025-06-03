import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CloudIcon,
  FolderIcon,
  GitBranchIcon,
  AlertTriangleIcon,
} from "lucide-react";
import SettingsLayout from "@/components/settings-layout";
import { deleteProject, getCurrentProject } from "@/lib/db";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      console.log("Attempting to delete project");
      const currentProject = await getCurrentProject();
      if (currentProject) {
        console.log("Deleting project", currentProject.id);
        await deleteProject(currentProject.id);
        // Redirect to home or project selection page
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SettingsLayout
      title="Settings"
      description="Manage your application settings and preferences"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Configure general application behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes to files
                  </p>
                </div>
                <Switch id="auto-save" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-commit">Auto-commit changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create commits for saved changes
                  </p>
                </div>
                <Switch id="auto-commit" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-commit-message">
                  Default commit message
                </Label>
                <Input
                  id="default-commit-message"
                  placeholder="Update to [filename]"
                  defaultValue="Update to [filename]"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CloudIcon className="h-5 w-5 mr-2" />
                  Remote Storage
                </CardTitle>
                <CardDescription>
                  Configure where your DICOM data is stored remotely
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link to="/settings/remote-storage">
                  <Button variant="outline" className="w-full">
                    Configure
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderIcon className="h-5 w-5 mr-2" />
                  Local Data
                </CardTitle>
                <CardDescription>
                  Manage local data storage locations
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link to="/settings/local-data">
                  <Button variant="outline" className="w-full">
                    Configure
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GitBranchIcon className="h-5 w-5 mr-2" />
                  Git Configuration
                </CardTitle>
                <CardDescription>
                  Configure Git and DVC settings
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link to="/settings/git-config">
                  <Button variant="outline" className="w-full">
                    Configure
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Danger Zone</h2>
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangleIcon className="h-5 w-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete a project, there is no going back. Please be
                certain.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete Project"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your project and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProject}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Project
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}
