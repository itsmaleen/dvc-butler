"use client";

import { useState } from "react";
import { toast } from "sonner";
import WizardLayout from "@/components/wizard-layout";
import ProjectInfoStep, { ProjectInfo } from "@/components/project-info-step";
import InitializeDvcStep, { DvcConfig } from "@/components/initialize-dvc-step";
import LocalDataStep, { LocalDataConfig } from "@/components/local-data-step";
import RemoteStorageStep, {
  RemoteStorageConfig,
} from "@/components/remote-storage-step";
import ReviewStep from "@/components/review-step";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  // State for each step
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    name: "",
    description: "",
  });

  const [dvcConfig, setDvcConfig] = useState<DvcConfig>({
    initialize: true,
  });

  const [localDataConfig, setLocalDataConfig] = useState<LocalDataConfig>({
    folderPath: "",
    folderType: "existing",
  });

  const [remoteStorageConfig, setRemoteStorageConfig] =
    useState<RemoteStorageConfig>({
      storageType: "s3",
      bucketName: "",
      accessKey: "",
      secretKey: "",
    });

  const steps = [
    "Project Info",
    "Initialize DVC",
    "Local Data",
    "Remote Storage",
    "Review",
  ];

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

    if (currentStep === 2 && !localDataConfig.folderPath) {
      toast("Folder path is required", {
        description: "Please specify a folder path for your DICOM data",
      });
      return;
    }

    if (currentStep === 3) {
      if (
        remoteStorageConfig.storageType === "s3" &&
        !remoteStorageConfig.bucketName
      ) {
        toast("Bucket name is required", {
          description: "Please specify an S3 bucket name",
        });
        return;
      }

      if (
        remoteStorageConfig.storageType === "gcs" &&
        !remoteStorageConfig.bucketName
      ) {
        toast("Bucket name is required", {
          description: "Please specify a GCS bucket name",
        });
        return;
      }

      if (
        remoteStorageConfig.storageType === "azure" &&
        !remoteStorageConfig.containerName
      ) {
        toast("Container name is required", {
          description: "Please specify an Azure container name",
        });
        return;
      }

      if (
        remoteStorageConfig.storageType === "local" &&
        !remoteStorageConfig.localPath
      ) {
        toast("Local path is required", {
          description: "Please specify a local path for remote storage",
        });
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    // Here you would typically save all the configuration and create the project
    toast("Project created successfully", {
      description: `Project ${projectInfo.name} has been created`,
    });

    // TODO: Navigate to the dashboard or the new project
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
  };

  const isNextDisabled = () => {
    if (currentStep === 0) {
      return !projectInfo.name || !/^[a-zA-Z0-9_-]+$/.test(projectInfo.name);
    }

    if (currentStep === 2) {
      return !localDataConfig.folderPath;
    }

    if (currentStep === 3) {
      if (remoteStorageConfig.storageType === "s3") {
        return !remoteStorageConfig.bucketName;
      }

      if (remoteStorageConfig.storageType === "gcs") {
        return !remoteStorageConfig.bucketName;
      }

      if (remoteStorageConfig.storageType === "azure") {
        return !remoteStorageConfig.containerName;
      }

      if (remoteStorageConfig.storageType === "local") {
        return !remoteStorageConfig.localPath;
      }
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <WizardLayout
        steps={steps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onComplete={handleComplete}
        isNextDisabled={isNextDisabled()}
        isLastStep={currentStep === steps.length - 1}
      >
        {currentStep === 0 && (
          <ProjectInfoStep
            projectInfo={projectInfo}
            onProjectInfoChange={setProjectInfo}
          />
        )}

        {currentStep === 1 && (
          <InitializeDvcStep
            dvcConfig={dvcConfig}
            onDvcConfigChange={setDvcConfig}
          />
        )}

        {currentStep === 2 && (
          <LocalDataStep
            localDataConfig={localDataConfig}
            onLocalDataConfigChange={setLocalDataConfig}
          />
        )}

        {currentStep === 3 && (
          <RemoteStorageStep
            remoteStorageConfig={remoteStorageConfig}
            onRemoteStorageConfigChange={setRemoteStorageConfig}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            projectInfo={projectInfo}
            dvcConfig={dvcConfig}
            localDataConfig={localDataConfig}
            remoteStorageConfig={remoteStorageConfig}
            onEditStep={handleEditStep}
          />
        )}
      </WizardLayout>
    </div>
  );
}
