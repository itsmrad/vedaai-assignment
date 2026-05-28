"use client";

import { Loader2, FileText, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePaperStore } from "@/store/paper";
import { toast } from "sonner";
import type { Assignment, AssignmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  assignment: Assignment;
  status?: AssignmentStatus;
}

export function PaperBanner({ assignment, status }: Props) {
  const downloadPdf = usePaperStore((s) => s.downloadPdf);
  const regenerate = usePaperStore((s) => s.regenerate);
  const regenerateWithFeedback = usePaperStore((s) => s.regenerateWithFeedback);
  const pdfState = usePaperStore((s) => s.pdfState[assignment._id]);
  const comments = usePaperStore((s) => s.sectionComments[assignment._id]);

  const commentCount = comments ? Object.keys(comments).length : 0;
  const isReady = status === "completed";
  const isGenerating = status === "queued" || status === "generating";

  const handleDownload = async () => {
    if (!isReady) return;
    const blob = await downloadPdf(assignment._id);
    if (!blob) {
      toast.error("Could not generate PDF. Try again in a moment.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assignment.title.replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded");
  };

  const handleRegenerate = async () => {
    try {
      await regenerate(assignment._id);
      toast.info("Regenerating paper…");
    } catch {
      toast.error("Could not start regeneration");
    }
  };

  const handleRegenerateWithFeedback = async () => {
    try {
      await regenerateWithFeedback(assignment._id);
      toast.info("Regenerating with your feedback…");
    } catch {
      toast.error("Could not start regeneration");
    }
  };

  return (
    <div className="rounded-2xl bg-foreground p-5 text-background shadow-sm sm:p-6">
      <p className="max-w-3xl text-sm leading-relaxed sm:text-base">
        {isGenerating ? (
          <>
            Hang tight — VedaAI is drafting your{" "}
            <span className="font-semibold">{assignment.title}</span>{" "}
            paper now. You&apos;ll see it appear below as soon as it&apos;s ready.
          </>
        ) : (
          <>
            Here&apos;s your customized question paper for{" "}
            <span className="font-semibold">{assignment.title}</span>
            {assignment.subject && <> ({assignment.subject})</>}.
            {isReady && commentCount === 0 && (
              <span className="block mt-1 text-background/60 text-sm">
                Right-click on any section to add feedback for regeneration.
              </span>
            )}
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "gap-2 bg-background text-foreground hover:bg-background/90",
            !isReady && "opacity-60",
          )}
          onClick={handleDownload}
          disabled={!isReady || pdfState?.kind === "rendering"}
        >
          {pdfState?.kind === "rendering" ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <FileText data-icon="inline-start" />
          )}
          {pdfState?.kind === "rendering" ? "Rendering PDF…" : "Download as PDF"}
        </Button>

        {commentCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={handleRegenerateWithFeedback}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <MessageSquare data-icon="inline-start" />
            )}
            Regenerate with Feedback
            <Badge variant="secondary" className="ml-1 bg-white/20 text-brand-foreground text-[11px]">
              {commentCount}
            </Badge>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="gap-2 bg-white/10 text-background hover:bg-white/15"
            onClick={handleRegenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            Regenerate
          </Button>
        )}

        {isReady && (
          <span className="ml-1 inline-flex items-center gap-1.5 text-xs text-background/70">
            <span className="size-1.5 rounded-full bg-online" />
            Ready
          </span>
        )}
      </div>
    </div>
  );
}
