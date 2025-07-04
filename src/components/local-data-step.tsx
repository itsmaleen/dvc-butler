import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfoIcon, FolderIcon, PlusIcon } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface LocalDataConfig {
  folderPath: string;
  folderType: "existing" | "new";
}

interface LocalDataStepProps {
  localDataConfig: LocalDataConfig;
  onLocalDataConfigChange: (config: LocalDataConfig) => void;
}

export default function LocalDataStep({
  localDataConfig,
  onLocalDataConfigChange,
}: LocalDataStepProps) {
  const [pathError, setPathError] = useState<string | null>(null);

  const handleFolderTypeChange = (value: "existing" | "new") => {
    onLocalDataConfigChange({ ...localDataConfig, folderType: value });
  };

  const handleFolderPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Basic path validation
    if (!value.trim()) {
      setPathError("Folder path is required");
    } else if (
      localDataConfig.folderType === "existing" &&
      value.includes("*")
    ) {
      setPathError("Invalid folder path");
    } else {
      setPathError(null);
    }

    onLocalDataConfigChange({ ...localDataConfig, folderPath: value });
  };

  const handleBrowseClick = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title:
          localDataConfig.folderType === "existing"
            ? "Select Existing Data Folder"
            : "Select Location for New Data Folder",
      });

      if (selected) {
        onLocalDataConfigChange({
          ...localDataConfig,
          folderPath: selected as string,
        });
        setPathError(null);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      setPathError("Failed to select folder");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Local Data Folder</h2>
        <p className="text-muted-foreground">
          Select where your data files will be stored locally.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="folder-type">Folder Type</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Choose whether to use an existing folder or create a new one
                    for your data files.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={localDataConfig.folderType}
            onValueChange={handleFolderTypeChange as (value: string) => void}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select folder type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="existing">Use existing folder</SelectItem>
              <SelectItem value="new">Create new folder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="folder-path">
              {localDataConfig.folderType === "existing"
                ? "Existing Folder Path"
                : "New Folder Path"}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {localDataConfig.folderType === "existing"
                      ? "Select an existing folder where your data files are stored."
                      : "Specify a path where a new folder will be created for your data files."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex space-x-2">
            <Input
              id="folder-path"
              placeholder={
                localDataConfig.folderType === "existing"
                  ? "/path/to/existing/data/folder"
                  : "/path/to/new/data/folder"
              }
              value={localDataConfig.folderPath}
              onChange={handleFolderPathChange}
              className={pathError ? "border-red-500" : ""}
            />

            <Button type="button" variant="outline" onClick={handleBrowseClick}>
              <FolderIcon className="h-4 w-4 mr-2" />
              Browse
            </Button>
          </div>
          {pathError && <p className="text-sm text-red-500">{pathError}</p>}
        </div>
      </div>

      {localDataConfig.folderType === "new" && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
          <div className="flex items-start">
            <PlusIcon className="h-4 w-4 mt-0.5 mr-2 text-blue-500" />

            <AlertDescription className="text-sm">
              A new folder will be created at the specified location. If the
              parent directories don't exist, they will be created
              automatically.
            </AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}
