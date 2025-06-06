import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

interface FileNode {
  name: string;
  size: number;
  is_directory: boolean;
  children?: FileNode[];
}

interface FileTreeProps {
  initialPath: string;
  onSelectionChange?: (selectedPaths: string[]) => void;
}

export function FileTree({ initialPath, onSelectionChange }: FileTreeProps) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  const loadTree = async () => {
    try {
      const result = await invoke<FileNode>("get_file_tree_structure", {
        path: initialPath,
      });
      setTree(result);
    } catch (error) {
      console.error("Error loading file tree:", error);
    }
  };

  // Load tree on mount
  useState(() => {
    loadTree();
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleSelection = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const renderNode = (node: FileNode, path: string, level: number = 0) => {
    const fullPath = path + "/" + node.name;
    const isExpanded = expandedFolders.has(fullPath);
    const isSelected = selectedPaths.has(fullPath);
    const isDicomFile =
      !node.is_directory && node.name.toLowerCase().endsWith(".dcm");

    return (
      <div key={fullPath}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-sm",
            level > 0 && "ml-4"
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(fullPath)}
            className="h-4 w-4"
          />
          {node.is_directory ? (
            <button
              onClick={() => toggleFolder(fullPath)}
              className="flex items-center gap-1 text-sm"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-4 w-4 text-blue-500" />
              <span>{node.name}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-sm">
              <File className="h-4 w-4 text-gray-500" />
              {isDicomFile ? (
                <Link
                  to="/dicom-viewer"
                  search={{ path: fullPath }}
                  className="text-blue-500 hover:underline"
                >
                  {node.name}
                </Link>
              ) : (
                <span>{node.name}</span>
              )}
            </div>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {formatSize(node.size)}
          </span>
        </div>
        {node.is_directory && isExpanded && node.children && (
          <div>
            {node.children.map((child) =>
              renderNode(child, fullPath, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!tree) {
    return <div>Loading...</div>;
  }

  return <div className="py-2">{renderNode(tree, initialPath)}</div>;
}
