import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ProjectInfo {
  name: string;
  description: string;
}

interface ProjectInfoStepProps {
  projectInfo: ProjectInfo;
  onProjectInfoChange: (info: ProjectInfo) => void;
}

export default function ProjectInfoStep({
  projectInfo,
  onProjectInfoChange,
}: ProjectInfoStepProps) {
  const [nameError, setNameError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Validate project name
    if (!value.trim()) {
      setNameError("Project name is required");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setNameError(
        "Project name can only contain letters, numbers, hyphens, and underscores"
      );
    } else {
      setNameError(null);
    }

    onProjectInfoChange({ ...projectInfo, name: value });
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    onProjectInfoChange({ ...projectInfo, description: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Project Information</h2>
        <p className="text-muted-foreground">
          Let's start by giving your project a name and description.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Choose a unique name for your project. This will be used as
                    the folder name. Only letters, numbers, hyphens, and
                    underscores are allowed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="project-name"
            placeholder="my-data-project"
            value={projectInfo.name}
            onChange={handleNameChange}
            className={nameError ? "border-red-500" : ""}
          />

          {nameError && <p className="text-sm text-red-500">{nameError}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="project-description">Project Description</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Provide a brief description of your project. This will help
                    you and others understand the purpose of this project.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="project-description"
            placeholder="A brief description of your data project..."
            value={projectInfo.description}
            onChange={handleDescriptionChange}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
