// import { XIcon } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";

interface CommandCenterProps {
  selectedFiles: string[];
  onAction: (action: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  selectedFiles,
  onAction,
}) => {
  if (selectedFiles.length === 0) return null;

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
        <Button type="button" variant="outline" onClick={() => onAction("add")}>
          Add
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onAction("checkout")}
        >
          Checkout
        </Button>
        {/* Add more actions as needed */}
      </div>
    </div>
  );
};
