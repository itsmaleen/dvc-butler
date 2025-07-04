import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  PlusCircle,
  CircleDot,
  CheckCircle,
  CircleDashed,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { EventCategory, startTiming, endTiming } from "@/lib/analytics";

interface FileEntry {
  path: string;
  size: number;
  is_directory: boolean;
  has_dvc_file: boolean;
  git_status: string;
}

interface FileNode {
  name: string;
  size: number;
  is_directory: boolean;
  children?: FileNode[];
  has_dvc_file: boolean;
  git_status: string;
}

interface FileStatus {
  path: string;
  git_status: string;
  has_dvc_file: boolean;
}

interface FileTreeProps {
  initialPath: string;
  onSelectionChange?: (selectedPaths: Set<string>) => void;
}

export interface FileTreeHandle {
  updateFileStatuses: (paths: string[]) => Promise<void>;
}

// Convert flat FileEntry array to hierarchical FileNode tree
function buildFileTree(entries: FileEntry[]): FileNode | null {
  if (entries.length === 0) {
    return null;
  }

  // The entries have paths relative to the repository root
  // We need to build a tree structure from these flat paths

  // Create a map to store nodes by their path
  const nodeMap = new Map<string, FileNode>();

  // Sort entries by path to ensure parent directories come before children
  const sortedEntries = [...entries].sort((a, b) =>
    a.path.localeCompare(b.path)
  );

  for (const entry of sortedEntries) {
    const pathParts = entry.path.split("/");
    const name = pathParts[pathParts.length - 1];

    const node: FileNode = {
      name,
      size: entry.size,
      is_directory: entry.is_directory,
      children: entry.is_directory ? [] : undefined,
      has_dvc_file: entry.has_dvc_file,
      git_status: entry.git_status,
    };

    nodeMap.set(entry.path, node);

    // If this is not the root level, add it to its parent's children
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join("/");
      const parentNode = nodeMap.get(parentPath);
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      }
    }
  }

  // Find the root node (the one with the shortest path)
  const rootPaths = Array.from(nodeMap.keys()).filter((path) => {
    const pathParts = path.split("/");
    return pathParts.length === 1;
  });

  if (rootPaths.length === 0) {
    return null;
  }

  // Create a virtual root node that contains all top-level items
  const rootNode: FileNode = {
    name: "",
    size: 0,
    is_directory: true,
    children: [],
    has_dvc_file: false,
    git_status: "",
  };

  for (const rootPath of rootPaths) {
    const node = nodeMap.get(rootPath);
    if (node) {
      rootNode.children!.push(node);
    }
  }

  return rootNode;
}

export const FileTree = forwardRef<FileTreeHandle, FileTreeProps>(
  function FileTree({ initialPath, onSelectionChange }, ref) {
    const [tree, setTree] = useState<FileNode | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set()
    );
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [loadingCheckboxes, setLoadingCheckboxes] = useState<Set<string>>(
      new Set()
    );

    // Expose the updateFileStatuses method via ref
    useImperativeHandle(ref, () => ({
      updateFileStatuses: async (paths: string[]) => {
        console.log("updateFileStatuses", paths);
        const timingId = startTiming(
          EventCategory.ACTION,
          "update_file_statuses",
          {
            pathCount: paths.length,
          }
        );
        try {
          const statuses = await invoke<FileStatus[]>("get_files_status", {
            repoPath: initialPath,
            filePaths: paths,
          });

          setTree((currentTree) => {
            if (!currentTree) return null;

            const updateNodeStatus = (
              node: FileNode,
              parentPath: string
            ): FileNode => {
              const fullPath = parentPath + "/" + node.name;
              const status = statuses.find((s) => {
                if (s.path === fullPath) {
                  return true;
                }
                const statusFullPath = initialPath + "/" + s.path;
                return statusFullPath === fullPath;
              });

              if (status) {
                return {
                  ...node,
                  git_status: status.git_status,
                  has_dvc_file: status.has_dvc_file,
                };
              }

              if (node.children) {
                return {
                  ...node,
                  children: node.children.map((child) =>
                    updateNodeStatus(child, fullPath)
                  ),
                };
              }

              return node;
            };

            return {
              ...currentTree,
              children: currentTree.children?.map((child) =>
                updateNodeStatus(child, initialPath)
              ),
            };
          });
        } catch (error) {
          console.error("Error updating file statuses:", error);
        } finally {
          endTiming(timingId);
        }
      },
    }));

    // Load selected files from state on mount
    useEffect(() => {
      const loadSelectedFiles = async () => {
        const timingId = startTiming(
          EventCategory.ACTION,
          "load_selected_files"
        );
        try {
          const files = await invoke<string[]>("get_selected_files");
          setSelectedPaths(new Set(files));
        } catch (error) {
          console.error("Error loading selected files:", error);
        } finally {
          endTiming(timingId);
        }
      };
      loadSelectedFiles();
    }, []);

    const loadTree = async () => {
      const timingId = startTiming(EventCategory.ACTION, "load_file_tree", {
        path: initialPath,
      });
      try {
        const result = await invoke<FileEntry[]>("get_file_tree_structure", {
          path: initialPath,
        });
        const treeStructure = buildFileTree(result);
        setTree(treeStructure);
      } catch (error) {
        alert("Error loading file tree: " + error);
        console.error("Error loading file tree:", error);
      } finally {
        endTiming(timingId);
      }
    };

    // Load tree and git status on mount and when dvcStagedFiles changes
    useEffect(() => {
      loadTree();
    }, [initialPath]);

    // Helper to get all descendant file and folder paths for a given node
    const getAllDescendantPaths = (
      node: FileNode,
      currentPath: string
    ): string[] => {
      let paths: string[] = [];
      const fullPath = currentPath + "/" + node.name;
      if (node.is_directory && node.children) {
        for (const child of node.children) {
          paths.push(fullPath + "/" + child.name);
          if (child.is_directory) {
            paths = paths.concat(getAllDescendantPaths(child, fullPath));
          }
        }
      }
      return paths;
    };

    const findNodeByPath = (
      node: FileNode,
      targetPath: string,
      currentPath: string
    ): FileNode | null => {
      // For the virtual root node (name === ""), use currentPath as fullPath
      const fullPath =
        node.name === "" ? currentPath : currentPath + "/" + node.name;
      if (fullPath === targetPath) return node;
      if (node.is_directory && node.children) {
        for (const child of node.children) {
          const found = findNodeByPath(child, targetPath, fullPath);
          if (found) return found;
        }
      }
      return null;
    };

    const getAllDescendantFolderPaths = (
      node: FileNode,
      currentPath: string
    ): string[] => {
      let paths: string[] = [];
      const fullPath =
        node.name === "" ? currentPath : currentPath + "/" + node.name;
      if (node.is_directory && node.children) {
        paths.push(fullPath);
        for (const child of node.children) {
          if (child.is_directory) {
            paths = paths.concat(getAllDescendantFolderPaths(child, fullPath));
          }
        }
      }
      return paths;
    };

    const toggleFolder = (path: string) => {
      const timingId = startTiming(EventCategory.ACTION, "toggle_folder", {
        path,
      });
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        endTiming(timingId);
        return next;
      });
    };

    const toggleSelection = async (path: string) => {
      setLoadingCheckboxes((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
      const timingId = startTiming(
        EventCategory.ACTION,
        "toggle_file_selection",
        { path }
      );
      try {
        // Find the node for the given path
        let node: FileNode | null = null;
        if (tree) {
          node = findNodeByPath(tree, path, initialPath);
        }
        if (selectedPaths.has(path)) {
          // Unselect this path and all descendants if directory
          if (node && node.is_directory) {
            const allDescendants = getAllDescendantPaths(
              node,
              path.substring(0, path.lastIndexOf("/"))
            );
            await invoke("remove_selected_file", { path });
            for (const descendant of allDescendants) {
              await invoke("remove_selected_file", { path: descendant });
            }
            setSelectedPaths((prev) => {
              const next = new Set(prev);
              next.delete(path);
              for (const descendant of allDescendants) {
                next.delete(descendant);
              }
              onSelectionChange?.(next);
              return next;
            });
          } else {
            await invoke("remove_selected_file", { path });
            setSelectedPaths((prev) => {
              const next = new Set(prev);
              next.delete(path);
              onSelectionChange?.(next);
              return next;
            });
          }
        } else {
          // Select this path and all descendants if directory
          if (node && node.is_directory) {
            const allDescendants = getAllDescendantPaths(
              node,
              path.substring(0, path.lastIndexOf("/"))
            );
            await invoke("add_selected_file", { path });
            for (const descendant of allDescendants) {
              await invoke("add_selected_file", { path: descendant });
            }
            setSelectedPaths((prev) => {
              const next = new Set(prev);
              next.add(path);
              for (const descendant of allDescendants) {
                next.add(descendant);
              }
              onSelectionChange?.(next);
              return next;
            });
          } else {
            await invoke("add_selected_file", { path });
            setSelectedPaths((prev) => {
              const next = new Set(prev);
              next.add(path);
              onSelectionChange?.(next);
              return next;
            });
          }
        }
      } catch (error) {
        console.error("Error toggling file selection:", error);
      } finally {
        setLoadingCheckboxes((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
        endTiming(timingId);
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
        case "staged":
          return (
            <span title="Staged">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </span>
          );
        case "deleted":
          return (
            <span title="Deleted">
              <CircleDashed className="h-4 w-4 text-red-500" />
            </span>
          );
        case "pushed":
          return null; // No icon for pushed files
        case "partially_staged":
          return (
            <span title="Partially Staged">
              <CircleDot className="h-4 w-4 text-blue-500" />
            </span>
          );
        case "conflict":
          return (
            <span title="Conflict">
              <CircleDot className="h-4 w-4 text-red-500" />
            </span>
          );
        default:
          return null;
      }
    };

    // Helper to determine if a folder is indeterminate (some but not all children selected)
    const isFolderIndeterminate = (
      node: FileNode,
      fullPath: string
    ): boolean => {
      if (!node.is_directory || !node.children || node.children.length === 0)
        return false;
      let total = 0;
      let selected = 0;
      const countSelections = (n: FileNode, p: string) => {
        const fp = p + "/" + n.name;
        if (n.is_directory && n.children) {
          for (const child of n.children) {
            countSelections(child, fp);
          }
        } else {
          total++;
          if (selectedPaths.has(fp)) selected++;
        }
      };
      for (const child of node.children) {
        countSelections(child, fullPath);
      }
      return selected > 0 && selected < total;
    };

    const renderNode = (node: FileNode, path: string, level: number = 0) => {
      // Skip hidden files and folders (those starting with .)
      if (node.name.startsWith(".") || node.name === "") {
        return null;
      }

      const fullPath = path + "/" + node.name;

      const isExpanded = expandedFolders.has(fullPath);
      const isSelected = selectedPaths.has(fullPath);

      const displayStatus = node.git_status;

      const dvcTrackedIcon = node.has_dvc_file ? (
        <span title="DVC Tracked">
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            style={{ display: "inline", marginLeft: 2 }}
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              stroke="#38bdf8"
              strokeWidth="2"
              fill="none"
            />
            <text
              x="10"
              y="15"
              textAnchor="middle"
              fontSize="10"
              fill="#38bdf8"
            >
              D
            </text>
          </svg>
        </span>
      ) : null;

      // Indeterminate state for folders
      const indeterminate =
        node.is_directory && isFolderIndeterminate(node, path);

      return (
        <div key={fullPath}>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-sm"
            )}
            style={{ marginLeft: `${level * 16}px` }}
          >
            {loadingCheckboxes.has(fullPath) ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Checkbox
                checked={isSelected}
                indeterminate={indeterminate}
                onCheckedChange={() => {
                  setTimeout(() => toggleSelection(fullPath), 0);
                }}
                className="h-4 w-4"
              />
            )}
            {node.is_directory ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setTimeout(() => toggleFolder(fullPath), 0);
                }}
                className="flex items-center gap-1 text-sm"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Folder className="h-4 w-4 text-blue-500" />
                <span>{node.name}</span>
                {dvcTrackedIcon}
              </button>
            ) : (
              <div className="flex items-center gap-1 text-sm">
                <File className="h-4 w-4 text-gray-500" />
                <span>{node.name}</span>
                {dvcTrackedIcon}
              </div>
            )}
            {/* Git/DVC status icon */}
            {getGitStatusIcon(displayStatus)}
            {/* Show status string for debugging/visibility */}
            <span className="ml-2 text-xs text-gray-400">{displayStatus}</span>
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
);
