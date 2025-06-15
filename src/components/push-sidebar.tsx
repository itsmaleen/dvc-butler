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

export function PushSidebar({
  open,
  onOpenChange,
  stagedFiles,
  repoPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagedFiles: string[];
  repoPath: string;
}) {
  const [summary, setSummary] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const canPush = summary.trim().length > 0;

  const handleCommitAndPush = async () => {
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
    } catch (err: any) {
      console.error(err);
      setError(err?.toString() || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

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
