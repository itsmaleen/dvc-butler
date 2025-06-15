import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Search,
  GitBranch,
  ArrowDownToLine,
  ArrowUpToLine,
  ArchiveRestore,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function TopBar({ onPush }: { onPush: () => void }) {
  // Placeholder values for repo and branch
  //   const repo = "my-repo";
  const branch = "main";
  const branches = ["main", "dev", "feature-x"];

  // --- GIT STATUS LOGIC ---
  const [stagedFiles, setStagedFiles] = useState<
    { path: string; status: string }[]
  >([]);
  const repoPath = "."; // TODO: Replace with actual repo path from context or props

  useEffect(() => {
    invoke<{ path: string; status: string }[]>("git_status", { repoPath })
      .then(setStagedFiles)
      .catch(() => setStagedFiles([]));
  }, [repoPath]);

  const canPush = stagedFiles.length > 0;

  return (
    <div className="flex items-center justify-between h-12 px-4 border-b bg-background/95">
      {/* Left: Repo > Branch */}
      <div className="flex items-center gap-2 min-w-0">
        <Breadcrumb>
          <BreadcrumbList>
            {/* <BreadcrumbItem>
              <span className="font-semibold truncate max-w-[120px] inline-block align-middle">
                {repo}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator /> */}
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-2 gap-1">
                    <GitBranch className="size-4" />
                    <span className="truncate max-w-[80px]">{branch}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
                  {branches.map((b) => (
                    <DropdownMenuItem key={b} className="gap-2">
                      <GitBranch className="size-4" />
                      {b}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {/* Center: Git Actions */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-4 mb-0.5">
          <span className="text-xs text-muted-foreground w-12 text-center">
            Pull
          </span>
          <span className="text-xs text-muted-foreground w-12 text-center">
            Push
          </span>
          <span className="text-xs text-muted-foreground w-12 text-center">
            Branch
          </span>
          <span className="text-xs text-muted-foreground w-12 text-center">
            Stash
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-12">
                <ArrowDownToLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pull</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12"
                onClick={onPush}
                disabled={!canPush}
              >
                <ArrowUpToLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canPush ? "Push" : "No staged files to push"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-12">
                <GitBranch className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Branch</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-12">
                <ArchiveRestore className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stash</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {/* Right: Search */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
