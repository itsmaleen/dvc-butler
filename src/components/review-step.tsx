import { CheckIcon, CloudIcon, FolderIcon, GitBranchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProjectInfo } from "@/components/project-info-step";
import { DvcConfig } from "@/components/initialize-dvc-step";
import { LocalDataConfig } from "@/components/local-data-step";
import { RemoteStorageConfig } from "@/components/remote-storage-step";

interface ReviewStepProps {
  projectInfo: ProjectInfo;
  dvcConfig: DvcConfig;
  localDataConfig: LocalDataConfig;
  remoteStorageConfig: RemoteStorageConfig;
  onEditStep: (step: number) => void;
}

export default function ReviewStep({
  projectInfo,
  dvcConfig,
  localDataConfig,
  remoteStorageConfig,
  onEditStep,
}: ReviewStepProps) {
  const getStorageTypeLabel = (type: string) => {
    switch (type) {
      case "s3":
        return "Amazon S3";
      case "gcs":
        return "Google Cloud Storage";
      case "azure":
        return "Azure Blob Storage";
      case "local":
        return "Local Path";
      case "none":
        return "No Remote Storage";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review Your Configuration</h2>
        <p className="text-muted-foreground">
          Please review your project configuration before finalizing.
        </p>
      </div>

      <div className="space-y-6">
        {/* Project Information */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium">Project Information</h3>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(0)}>
              Edit
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-sm font-medium text-muted-foreground">
                Project Name:
              </div>
              <div className="col-span-2 font-medium">
                {projectInfo.name || "Not specified"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-sm font-medium text-muted-foreground">
                Description:
              </div>
              <div className="col-span-2">
                {projectInfo.description || "No description provided"}
              </div>
            </div>
          </div>
        </div>

        {/* DVC Configuration */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium">DVC Configuration</h3>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
              Edit
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center">
              <GitBranchIcon className="h-5 w-5 mr-2 text-blue-500" />

              <div className="font-medium">
                {dvcConfig.initialize
                  ? "DVC will be initialized"
                  : "DVC will not be initialized"}
              </div>
            </div>
          </div>
        </div>

        {/* Local Data Configuration */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium">Local Data Configuration</h3>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
              Edit
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center">
              <FolderIcon className="h-5 w-5 mr-2 text-blue-500" />

              <div>
                <div className="font-medium">
                  {localDataConfig.folderType === "existing"
                    ? "Using existing folder"
                    : "Creating new folder"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {localDataConfig.folderPath || "No path specified"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remote Storage Configuration */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium">Remote Storage Configuration</h3>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>
              Edit
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center">
              <CloudIcon className="h-5 w-5 mr-2 text-blue-500" />

              <div>
                <div className="font-medium">
                  {getStorageTypeLabel(remoteStorageConfig.storageType)}
                </div>
                {remoteStorageConfig.storageType === "s3" && (
                  <div className="text-sm text-muted-foreground">
                    Bucket: {remoteStorageConfig.bucketName || "Not specified"}
                  </div>
                )}
                {remoteStorageConfig.storageType === "gcs" && (
                  <div className="text-sm text-muted-foreground">
                    Bucket: {remoteStorageConfig.bucketName || "Not specified"},
                    Project: {remoteStorageConfig.projectId || "Not specified"}
                  </div>
                )}
                {remoteStorageConfig.storageType === "azure" && (
                  <div className="text-sm text-muted-foreground">
                    Container:{" "}
                    {remoteStorageConfig.containerName || "Not specified"}
                  </div>
                )}
                {remoteStorageConfig.storageType === "local" && (
                  <div className="text-sm text-muted-foreground">
                    Path: {remoteStorageConfig.localPath || "Not specified"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
          <CheckIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500" />

          <AlertDescription className="text-sm">
            Your project is ready to be created. Click "Complete Setup" to
            finish the configuration.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
