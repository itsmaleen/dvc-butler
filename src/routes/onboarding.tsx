import LocalDataStep, { LocalDataConfig } from "@/components/local-data-step";
import ProjectInfoStep, { ProjectInfo } from "@/components/project-info-step";
import ReviewStep from "@/components/review-step";
import WizardLayout from "@/components/wizard-layout";
import { createProject } from "@/lib/db";
import {
  createFileRoute,
  useNavigate,
  useCanGoBack,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate({ from: "/onboarding" });
  const canGoBack = useCanGoBack();

  const [currentStep, setCurrentStep] = useState(0);

  // State for each step
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    name: "",
    description: "",
  });

  const [localDataConfig, setLocalDataConfig] = useState<LocalDataConfig>({
    folderPath: "",
    folderType: "existing",
  });

  const [isCreating, setIsCreating] = useState(false);

  const steps = ["Project Info", "Local Data", "Review"];

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      if (!projectInfo.name) {
        toast("Project name is required", {
          description: "Please enter a name for your project",
        });
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(projectInfo.name)) {
        toast("Invalid project name", {
          description:
            "Project name can only contain letters, numbers, hyphens, and underscores",
        });
        return;
      }
    }

    if (currentStep === 1 && !localDataConfig.folderPath) {
      toast("Folder path is required", {
        description: "Please specify a folder path for your data files",
      });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    setIsCreating(true);
    const toastId = toast.loading("Creating project...", {
      description: "Setting up your project configuration",
    });

    try {
      // Set initialize to true for DVC
      const dvcConfig = { initialize: true };

      // Default to no remote storage
      const remoteStorageConfig = { storageType: "none" as const };

      await createProject(
        projectInfo,
        dvcConfig,
        localDataConfig,
        remoteStorageConfig
      );

      toast.loading("Initializing DVC...", {
        id: toastId,
        description: "Setting up DVC in your project directory",
      });

      await invoke("init_dvc_project", {
        path: localDataConfig.folderPath,
      });

      toast.success("Project created successfully", {
        id: toastId,
        description: `Project ${projectInfo.name} has been created and initialized`,
      });

      navigate({ to: "/", search: { path: localDataConfig.folderPath } });
    } catch (error) {
      console.error(error);
      toast.error("Error creating project", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
  };

  const isNextDisabled = () => {
    if (currentStep === 0) {
      return !projectInfo.name || !/^[a-zA-Z0-9_-]+$/.test(projectInfo.name);
    }

    if (currentStep === 1) {
      return !localDataConfig.folderPath;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-background py-8">
      {canGoBack && (
        <div className="container mx-auto px-4 mb-4">
          <button
            onClick={() => router.history.back()}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            disabled={isCreating}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
      )}
      <WizardLayout
        steps={steps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onComplete={handleComplete}
        isNextDisabled={isNextDisabled() || isCreating}
        isLastStep={currentStep === steps.length - 1}
        completeButtonContent={
          isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Project...
            </>
          ) : (
            "Create Project"
          )
        }
      >
        {currentStep === 0 && (
          <ProjectInfoStep
            projectInfo={projectInfo}
            onProjectInfoChange={setProjectInfo}
          />
        )}

        {currentStep === 1 && (
          <LocalDataStep
            localDataConfig={localDataConfig}
            onLocalDataConfigChange={setLocalDataConfig}
          />
        )}

        {currentStep === 2 && (
          <ReviewStep
            projectInfo={projectInfo}
            dvcConfig={{ initialize: true }}
            localDataConfig={localDataConfig}
            remoteStorageConfig={{ storageType: "none" }}
            onEditStep={handleEditStep}
          />
        )}
      </WizardLayout>
    </div>
  );
}
