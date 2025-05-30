import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface DvcConfig {
  initialize: boolean;
}

interface InitializeDvcStepProps {
  dvcConfig: DvcConfig;
  onDvcConfigChange: (config: DvcConfig) => void;
}

export default function InitializeDvcStep({
  dvcConfig,
  onDvcConfigChange,
}: InitializeDvcStepProps) {
  const handleToggleChange = (checked: boolean) => {
    onDvcConfigChange({ initialize: checked });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Initialize DVC</h2>
        <p className="text-muted-foreground">
          Data Version Control (DVC) helps you track changes to your DICOM data
          alongside your code.
        </p>
      </div>

      <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="dvc-toggle" className="text-base font-medium">
              Initialize DVC for this project
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    DVC (Data Version Control) allows you to track changes to
                    your DICOM data files, similar to how Git tracks code
                    changes.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            Track and version your DICOM data files separately from your code
          </p>
        </div>
        <Switch
          id="dvc-toggle"
          checked={dvcConfig.initialize}
          onCheckedChange={handleToggleChange}
        />
      </div>

      {dvcConfig.initialize && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
          <AlertDescription className="text-sm">
            <strong>What DVC will do:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Create a <code>.dvc</code> directory in your project
              </li>
              <li>Track large DICOM files without storing them in Git</li>
              <li>Enable versioning of your data alongside your code</li>
              <li>Allow you to easily switch between data versions</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!dvcConfig.initialize && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900">
          <AlertDescription className="text-sm">
            <strong>Without DVC:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Large DICOM files will need to be managed manually</li>
              <li>
                You'll need to implement your own data versioning strategy
              </li>
              <li>You can still initialize DVC later if needed</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
