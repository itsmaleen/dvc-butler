import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import * as React from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  EventCategory,
  startTiming,
  endTiming,
  trackError,
  trackEvent,
} from "@/lib/analytics";
import { FileTreeHandle } from "./file-tree";

export function PushSidebar({
  open,
  onOpenChange,
  stagedFiles,
  repoPath,
  fileTreeRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagedFiles: string[];
  repoPath: string;
  fileTreeRef: React.RefObject<FileTreeHandle>;
}) {
  const [summary, setSummary] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const canPush = summary.trim().length > 0;

  const handleCommitAndPush = async () => {
    const timingId = startTiming(EventCategory.ACTION, "git_commit_and_push", {
      repoPath,
      fileCount: stagedFiles.length,
      hasSummary: Boolean(summary.trim()),
      hasDescription: Boolean(description.trim()),
    });

    setError(null);
    setLoading(true);
    try {
      await invoke<string>("git_commit_and_push", {
        repoPath,
        summary,
        description,
      });
      setSummary("");
      setDescription("");
      onOpenChange(false);

      // Update file tree statuses after successful push
      if (fileTreeRef.current) {
        await fileTreeRef.current.updateFileStatuses(stagedFiles);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.toString() || "Unknown error";
      setError(errorMessage);
      trackError(new Error(errorMessage), {
        operation: "git_commit_and_push",
        repoPath,
        fileCount: stagedFiles.length,
      });
    } finally {
      setLoading(false);
      endTiming(timingId);
    }
  };

  // Track when the push sidebar is opened
  React.useEffect(() => {
    if (open) {
      trackEvent("push_sidebar_opened", {
        fileCount: stagedFiles.length,
        repoPath,
      });
    }
  }, [open, stagedFiles.length, repoPath]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Commit & Push</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-2">
          <div>
            <div className="font-medium mb-2">Staged Files</div>
            <div className="bg-muted rounded p-2 max-h-40 overflow-auto text-xs">
              {stagedFiles.length === 0 ? (
                <div className="text-muted-foreground">No files staged</div>
              ) : (
                <ul className="list-disc pl-4">
                  {stagedFiles.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Separator />
          <div>
            <label className="block text-xs font-medium mb-1">Summary</label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Commit summary"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            className="w-full"
            disabled={!canPush || loading}
            onClick={handleCommitAndPush}
          >
            {loading ? "Pushing..." : "Commit & Push"}
          </Button>
          {(!canPush || error) && (
            <div className="text-xs text-destructive mt-2 w-full text-center">
              {!canPush ? "Enter a commit summary to enable push" : error}
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
