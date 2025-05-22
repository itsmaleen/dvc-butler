import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InfoIcon,
  CloudIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import HelpTooltip from "@/components/help-tooltip";

export type StorageType = "s3" | "gcs" | "azure" | "local" | "none";

export interface RemoteStorageConfig {
  storageType: StorageType;
  bucketName?: string;
  accessKey?: string;
  secretKey?: string;
  containerName?: string;
  connectionString?: string;
  projectId?: string;
  keyFilePath?: string;
  localPath?: string;
}

interface RemoteStorageStepProps {
  remoteStorageConfig: RemoteStorageConfig;
  onRemoteStorageConfigChange: (config: RemoteStorageConfig) => void;
  onSave?: () => void;
  onCancel?: () => void;
  showSaveCancel?: boolean;
}

export default function RemoteStorageStep({
  remoteStorageConfig,
  onRemoteStorageConfigChange,
  onSave,
  onCancel,
  showSaveCancel = false,
}: RemoteStorageStepProps) {
  const [activeTab, setActiveTab] = useState<StorageType>(
    remoteStorageConfig.storageType || "none"
  );
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  const handleStorageTypeChange = (value: StorageType) => {
    setActiveTab(value);
    onRemoteStorageConfigChange({ ...remoteStorageConfig, storageType: value });
    // Reset connection status when changing storage type
    setConnectionStatus({
      status: "idle",
      message: "",
    });
  };

  const handleConfigChange = (field: string, value: string) => {
    onRemoteStorageConfigChange({ ...remoteStorageConfig, [field]: value });
    // Reset connection status when changing configuration
    setConnectionStatus({
      status: "idle",
      message: "",
    });
  };

  const handleBrowseLocalPath = () => {
    // In a real implementation, this would open a folder picker dialog
    // For now, we'll just simulate it with a sample path
    const samplePath = "/Users/username/Documents/dicom-remote-storage";
    handleConfigChange("localPath", samplePath);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({
      status: "idle",
      message: "",
    });

    // Simulate API call to test connection
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Randomly succeed or fail for demo purposes
          const success = Math.random() > 0.3;
          if (success) {
            resolve(true);
          } else {
            reject(new Error("Could not connect to remote storage"));
          }
        }, 1500);
      });

      setConnectionStatus({
        status: "success",
        message: "Connection successful! Your credentials are valid.",
      });
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          Remote Storage Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure where your DICOM data will be stored remotely.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="storage-type">Storage Type</Label>
            <HelpTooltip
              content="Select the type of remote storage you want to use for your DICOM data. This will determine where your data is stored and how it's accessed."
              side="right"
            />
          </div>
          <Select
            value={activeTab}
            onValueChange={handleStorageTypeChange as (value: string) => void}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select storage type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="s3">Amazon S3</SelectItem>
              <SelectItem value="gcs">Google Cloud Storage</SelectItem>
              <SelectItem value="azure">Azure Blob Storage</SelectItem>
              <SelectItem value="local">Local Path</SelectItem>
              <SelectItem value="none">No Remote Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeTab !== "none" && (
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="s3" className="space-y-4 mt-0">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <CloudIcon className="h-4 w-4 mt-0.5 mr-2 text-blue-500" />

                <AlertDescription className="text-sm">
                  Amazon S3 provides scalable object storage for your DICOM
                  data.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="s3-bucket">Bucket Name</Label>
                    <HelpTooltip
                      content="The name of the S3 bucket where your DICOM data will be stored. Bucket names must be globally unique across all AWS accounts."
                      side="right"
                    />
                  </div>
                  <Input
                    id="s3-bucket"
                    placeholder="my-dicom-bucket"
                    value={remoteStorageConfig.bucketName || ""}
                    onChange={(e) =>
                      handleConfigChange("bucketName", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="s3-access-key">Access Key</Label>
                    <HelpTooltip
                      content="Your AWS access key ID. This is part of your AWS security credentials."
                      side="right"
                    />
                  </div>
                  <Input
                    id="s3-access-key"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={remoteStorageConfig.accessKey || ""}
                    onChange={(e) =>
                      handleConfigChange("accessKey", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="s3-secret-key">Secret Key</Label>
                    <HelpTooltip
                      content="Your AWS secret access key. Keep this confidential as it provides full access to your AWS resources."
                      side="right"
                    />
                  </div>
                  <Input
                    id="s3-secret-key"
                    type="password"
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={remoteStorageConfig.secretKey || ""}
                    onChange={(e) =>
                      handleConfigChange("secretKey", e.target.value)
                    }
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={
                      testingConnection ||
                      !remoteStorageConfig.bucketName ||
                      !remoteStorageConfig.accessKey ||
                      !remoteStorageConfig.secretKey
                    }
                    className="w-fit"
                  >
                    {testingConnection ? "Testing..." : "Test Connection"}
                  </Button>

                  {connectionStatus.status !== "idle" && (
                    <Alert
                      className={
                        connectionStatus.status === "success"
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
                          : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
                      }
                    >
                      {connectionStatus.status === "success" ? (
                        <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                      )}
                      <AlertDescription className="text-sm">
                        {connectionStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gcs" className="space-y-4 mt-0">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <CloudIcon className="h-4 w-4 mt-0.5 mr-2 text-blue-500" />

                <AlertDescription className="text-sm">
                  Google Cloud Storage provides unified object storage for your
                  DICOM data.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="gcs-bucket">Bucket Name</Label>
                    <HelpTooltip
                      content="The name of the GCS bucket where your DICOM data will be stored. Bucket names must be globally unique across all GCP projects."
                      side="right"
                    />
                  </div>
                  <Input
                    id="gcs-bucket"
                    placeholder="my-dicom-bucket"
                    value={remoteStorageConfig.bucketName || ""}
                    onChange={(e) =>
                      handleConfigChange("bucketName", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="gcs-project-id">Project ID</Label>
                    <HelpTooltip
                      content="Your Google Cloud Platform project ID. This identifies the project where your bucket is located."
                      side="right"
                    />
                  </div>
                  <Input
                    id="gcs-project-id"
                    placeholder="my-gcp-project-id"
                    value={remoteStorageConfig.projectId || ""}
                    onChange={(e) =>
                      handleConfigChange("projectId", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="gcs-key-file">Key File Path</Label>
                    <HelpTooltip
                      content="Path to your GCP service account key file (JSON). This file contains credentials used to authenticate with Google Cloud."
                      side="right"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      id="gcs-key-file"
                      placeholder="/path/to/service-account-key.json"
                      value={remoteStorageConfig.keyFilePath || ""}
                      onChange={(e) =>
                        handleConfigChange("keyFilePath", e.target.value)
                      }
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBrowseLocalPath}
                    >
                      <FolderIcon className="h-4 w-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={
                      testingConnection ||
                      !remoteStorageConfig.bucketName ||
                      !remoteStorageConfig.projectId ||
                      !remoteStorageConfig.keyFilePath
                    }
                    className="w-fit"
                  >
                    {testingConnection ? "Testing..." : "Test Connection"}
                  </Button>

                  {connectionStatus.status !== "idle" && (
                    <Alert
                      className={
                        connectionStatus.status === "success"
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
                          : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
                      }
                    >
                      {connectionStatus.status === "success" ? (
                        <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                      )}
                      <AlertDescription className="text-sm">
                        {connectionStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="azure" className="space-y-4 mt-0">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <CloudIcon className="h-4 w-4 mt-0.5 mr-2 text-blue-500" />

                <AlertDescription className="text-sm">
                  Azure Blob Storage provides scalable object storage for your
                  DICOM data.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="azure-container">Container Name</Label>
                    <HelpTooltip
                      content="The name of the Azure Storage container where your DICOM data will be stored. Container names must be unique within your storage account."
                      side="right"
                    />
                  </div>
                  <Input
                    id="azure-container"
                    placeholder="my-dicom-container"
                    value={remoteStorageConfig.containerName || ""}
                    onChange={(e) =>
                      handleConfigChange("containerName", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="azure-connection-string">
                      Connection String
                    </Label>
                    <HelpTooltip
                      content="Your Azure Storage connection string. This contains all the information needed to authenticate with your Azure Storage account."
                      side="right"
                    />
                  </div>
                  <Input
                    id="azure-connection-string"
                    type="password"
                    placeholder="DefaultEndpointsProtocol=https;AccountName=..."
                    value={remoteStorageConfig.connectionString || ""}
                    onChange={(e) =>
                      handleConfigChange("connectionString", e.target.value)
                    }
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={
                      testingConnection ||
                      !remoteStorageConfig.containerName ||
                      !remoteStorageConfig.connectionString
                    }
                    className="w-fit"
                  >
                    {testingConnection ? "Testing..." : "Test Connection"}
                  </Button>

                  {connectionStatus.status !== "idle" && (
                    <Alert
                      className={
                        connectionStatus.status === "success"
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
                          : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
                      }
                    >
                      {connectionStatus.status === "success" ? (
                        <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                      )}
                      <AlertDescription className="text-sm">
                        {connectionStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="local" className="space-y-4 mt-0">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <FolderIcon className="h-4 w-4 mt-0.5 mr-2 text-blue-500" />

                <AlertDescription className="text-sm">
                  Use a local path as remote storage for your DICOM data. This
                  is useful for testing or when you don't need cloud storage.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="local-path">Local Path</Label>
                  <HelpTooltip
                    content="A path on your local file system or network drive where DICOM data will be stored. This should be a location with sufficient disk space."
                    side="right"
                  />
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="local-path"
                    placeholder="/path/to/remote/storage"
                    value={remoteStorageConfig.localPath || ""}
                    onChange={(e) =>
                      handleConfigChange("localPath", e.target.value)
                    }
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBrowseLocalPath}
                  >
                    <FolderIcon className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !remoteStorageConfig.localPath}
                  className="w-fit"
                >
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>

                {connectionStatus.status !== "idle" && (
                  <Alert
                    className={
                      connectionStatus.status === "success"
                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
                        : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
                    }
                  >
                    {connectionStatus.status === "success" ? (
                      <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                    )}
                    <AlertDescription className="text-sm">
                      {connectionStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {activeTab === "none" && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900">
            <AlertDescription className="text-sm">
              No remote storage will be configured. You can add remote storage
              later if needed.
            </AlertDescription>
          </Alert>
        )}

        {showSaveCancel && (
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save Changes</Button>
          </div>
        )}
      </div>
    </div>
  );
}
