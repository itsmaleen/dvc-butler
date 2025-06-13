import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  PlusCircle,
  CircleDot,
  CircleDashed,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

interface FileNode {
  name: string;
  size: number;
  is_directory: boolean;
  children?: FileNode[];
}

interface GitStatusEntry {
  path: string;
  status: string; // "untracked", "modified", "added", "committed", etc.
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
  const [gitStatus, setGitStatus] = useState<Record<string, string>>({});

  // Load selected files from state on mount
  useEffect(() => {
    const loadSelectedFiles = async () => {
      try {
        const files = await invoke<string[]>("get_selected_files");
        setSelectedPaths(new Set(files));
      } catch (error) {
        console.error("Error loading selected files:", error);
      }
    };
    loadSelectedFiles();
  }, []);

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

  // Load git status for all files in the repo
  const loadGitStatus = async () => {
    try {
      const result = await invoke<GitStatusEntry[]>("get_git_status", {
        path: initialPath,
      });
      const statusMap: Record<string, string> = {};
      for (const entry of result) {
        // Normalize path to match FileTree's fullPath
        let normalized = entry.path.replace(/\\/g, "/");
        if (!normalized.startsWith("/")) normalized = "/" + normalized;
        statusMap[normalized] = entry.status;
      }
      setGitStatus(statusMap);
    } catch (error) {
      console.error("Error loading git status:", error);
    }
  };

  // Load tree and git status on mount
  useEffect(() => {
    loadTree();
    loadGitStatus();
  }, []);

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

  const toggleSelection = async (path: string) => {
    try {
      if (selectedPaths.has(path)) {
        await invoke("remove_selected_file", { path });
        setSelectedPaths((prev) => {
          const next = new Set(prev);
          next.delete(path);
          onSelectionChange?.(Array.from(next));
          return next;
        });
      } else {
        await invoke("add_selected_file", { path });
        setSelectedPaths((prev) => {
          const next = new Set(prev);
          next.add(path);
          onSelectionChange?.(Array.from(next));
          return next;
        });
      }
    } catch (error) {
      console.error("Error toggling file selection:", error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Helper to get git status icon
  const getGitStatusIcon = (status?: string) => {
    switch (status) {
      case "untracked":
        return (
          <span title="Untracked">
            <PlusCircle className="h-4 w-4 text-yellow-500" />
          </span>
        );
      case "modified":
        return (
          <span title="Modified">
            <CircleDot className="h-4 w-4 text-orange-500" />
          </span>
        );
      case "added":
        return (
          <span title="Staged/Added">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </span>
        );
      case "deleted":
        return (
          <span title="Deleted">
            <CircleDashed className="h-4 w-4 text-red-500" />
          </span>
        );
      case "committed":
        return null; // No icon for committed/clean
      default:
        return null;
    }
  };

  const renderNode = (node: FileNode, path: string, level: number = 0) => {
    // Skip hidden files and folders (those starting with .)
    if (node.name.startsWith(".")) {
      return null;
    }

    const fullPath = path + "/" + node.name;
    const isExpanded = expandedFolders.has(fullPath);
    const isSelected = selectedPaths.has(fullPath);
    const isDicomFile =
      !node.is_directory && node.name.toLowerCase().endsWith(".dcm");
    // Get git status for this file (normalize to match statusMap)
    const gitStatusIcon = getGitStatusIcon(gitStatus[`/${node.name}`]);

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
          {/* Git status icon */}
          {gitStatusIcon}
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

  // Always render the children of the root folder
  if (tree.children) {
    return (
      <div className="py-2">
        {tree.children.map((child) => renderNode(child, initialPath))}
      </div>
    );
  }

  // Fallback case if somehow there are no children
  return <div className="py-2">No files found</div>;
}
