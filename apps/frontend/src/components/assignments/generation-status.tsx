"use client";

import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { usePaperStore } from "@/store/paper";
import type { AssignmentStatus } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  assignmentId: string;
  status?: AssignmentStatus;
  stage?: string;
  reason?: string;
}

const STAGE_TEXT: Record<string, string> = {
  "calling-llm": "Calling the language model…",
  persisting: "Saving the generated paper…",
};

const STAGE_PCT: Record<string, number> = {
  "calling-llm": 60,
  persisting: 90,
};

export function GenerationStatus({ assignmentId, status, stage, reason }: Props) {
  const regenerate = usePaperStore((s) => s.regenerate);

  if (status === "failed") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-5 text-destructive" />
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-sm font-medium">Generation failed</p>
              <p className="text-sm text-muted-foreground">
                {reason ?? "Something went wrong while drafting the paper."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={async () => {
                try {
                  await regenerate(assignmentId);
                  toast.info("Retrying…");
                } catch {
                  toast.error("Could not retry");
                }
              }}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pct = stage ? (STAGE_PCT[stage] ?? 30) : status === "queued" ? 10 : 30;
  const message =
    (stage && STAGE_TEXT[stage]) ??
    (status === "queued"
      ? "Queued — a worker will pick this up shortly"
      : "Generating your paper…");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">
              This usually takes 5–30 seconds.
            </p>
          </div>
        </div>
        <Progress value={pct} className="h-1.5" />
      </CardContent>
    </Card>
  );
}
