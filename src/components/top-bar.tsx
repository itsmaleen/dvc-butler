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
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function TopBar({
  repoPath,
  onPush,
}: {
  repoPath: string;
  onPush: () => void;
}) {
  const [branch, setBranch] = useState<string>("");
  const [branches, setBranches] = useState<string[]>([]);
  const [pulling, setPulling] = useState(false);
  const [stashing, setStashing] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branching, setBranching] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState<string | null>(null);

  // Fetch current branch and branches
  useEffect(() => {
    async function fetchBranchData() {
      try {
        const [current, list] = await Promise.all([
          invoke<string>("git_current_branch", { repoPath }),
          invoke<string[]>("git_list_branches", { repoPath }),
        ]);
        setBranch(current);
        setBranches(list);
      } catch (err) {
        setBranch("");
        setBranches([]);
      }
    }
    fetchBranchData();
  }, [repoPath]);

  // Refresh branch info after switching/creating branch
  useEffect(() => {
    if (!branchDialogOpen && !branching) {
      // After dialog closes and not loading, refresh
      (async () => {
        try {
          const [current, list] = await Promise.all([
            invoke<string>("git_current_branch", { repoPath }),
            invoke<string[]>("git_list_branches", { repoPath }),
          ]);
          setBranch(current);
          setBranches(list);
        } catch {}
      })();
    }
  }, [branchDialogOpen, branching, repoPath]);

  // --- GIT STATUS LOGIC ---
  const [stagedFiles, setStagedFiles] = useState<
    { path: string; status: string }[]
  >([]);

  useEffect(() => {
    invoke<{ path: string; status: string }[]>("git_status", { repoPath })
      .then(setStagedFiles)
      .catch(() => setStagedFiles([]));
  }, [repoPath]);

  const canPush = stagedFiles.length > 0;

  const handlePull = async () => {
    setPulling(true);
    try {
      await invoke<string>("git_pull", { repoPath });
      toast.success("Pulled from remote");
    } catch (err: any) {
      toast.error(err?.toString() || "Pull failed");
    } finally {
      setPulling(false);
    }
  };

  const handleStash = async () => {
    setStashing(true);
    try {
      await invoke<string>("git_stash", { repoPath });
      toast.success("Stashed changes");
    } catch (err: any) {
      toast.error(err?.toString() || "Stash failed");
    } finally {
      setStashing(false);
    }
  };

  const handleBranch = async () => {
    if (!branchName.trim()) {
      toast.error("Branch name required");
      return;
    }
    setBranching(true);
    try {
      await invoke<string>("git_checkout", {
        repoPath,
        branch: branchName.trim(),
      });
      toast.success(`Checked out to '${branchName.trim()}'`);
      setBranchDialogOpen(false);
      setBranchName("");
    } catch (err: any) {
      toast.error(err?.toString() || "Branch checkout failed");
    } finally {
      setBranching(false);
    }
  };

  const handleSwitchBranch = async (targetBranch: string) => {
    if (targetBranch === branch) return;
    setSwitchingBranch(targetBranch);
    try {
      await invoke<string>("git_switch_branch", {
        repoPath,
        branch: targetBranch,
      });
      toast.success(`Switched to '${targetBranch}'`);
      // Refresh branch info
      const [current, list] = await Promise.all([
        invoke<string>("git_current_branch", { repoPath }),
        invoke<string[]>("git_list_branches", { repoPath }),
      ]);
      setBranch(current);
      setBranches(list);
    } catch (err: any) {
      toast.error(err?.toString() || "Switch branch failed");
    } finally {
      setSwitchingBranch(null);
    }
  };

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
                    <DropdownMenuItem
                      key={b}
                      className="gap-2"
                      onClick={() => handleSwitchBranch(b)}
                      disabled={b === branch || switchingBranch === b}
                    >
                      <GitBranch className="size-4" />
                      <span>
                        {b}
                        {b === branch && " (current)"}
                        {switchingBranch === b && " (switching...)"}
                      </span>
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
              <Button
                variant="ghost"
                size="icon"
                className="w-12"
                onClick={handlePull}
                disabled={pulling}
              >
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
              <AlertDialog
                open={branchDialogOpen}
                onOpenChange={setBranchDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-12">
                    <GitBranch className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Checkout Branch</AlertDialogTitle>
                    <AlertDialogDescription>
                      Enter a branch name to checkout or create:
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Branch name"
                    className="mt-2"
                    autoFocus
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={branching}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={handleBranch}
                        disabled={branching || !branchName.trim()}
                      >
                        {branching ? "Switching..." : "Checkout"}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipTrigger>
            <TooltipContent>Branch</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12"
                onClick={handleStash}
                disabled={stashing}
              >
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
