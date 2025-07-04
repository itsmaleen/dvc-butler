// import { XIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { EventCategory, startTiming, endTiming } from "@/lib/analytics";
import { Loader2 } from "lucide-react";

interface CommandCenterProps {
  selectedFiles: string[];
  onAction: (action: string) => Promise<void>;
  setSelectedFiles: (files: Set<string>) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  selectedFiles,
  onAction,
  setSelectedFiles,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (selectedFiles.length === 0) return null;

  const handleAction = async (action: string) => {
    const timingId = startTiming(
      EventCategory.ACTION,
      `command_center_${action}`,
      {
        action,
        fileCount: selectedFiles.length,
      }
    );

    try {
      setLoadingAction(action);
      await onAction(action);
      setSelectedFiles(new Set());
    } finally {
      setLoadingAction(null);
      endTiming(timingId);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-lg flex gap-4 px-6 py-3 items-center"
        style={{ pointerEvents: "auto" }}
      >
        <div className="text-sm text-muted-foreground border border-gray-400 border-dotted rounded-md px-2 py-1 flex ">
          <span>
            {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          {/* <button
            onClick={() => onAction("clear")}
            className="btn btn-sm btn-ghost ml-2 hover:bg-transparent"
          >
            <XIcon className="w-4 h-4" />
          </button> */}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAction("add")}
          disabled={loadingAction === "add"}
        >
          {loadingAction === "add" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add"
          )}
        </Button>
        {/* <Button
          type="button"
          variant="outline"
          onClick={() => handleAction("checkout")}
          disabled={loadingAction === "checkout"}
        >
          {loadingAction === "checkout" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking out...
            </>
          ) : (
            "Checkout"
          )}
        </Button> */}
        {/* Add more actions as needed */}
      </div>
    </div>
  );
};
