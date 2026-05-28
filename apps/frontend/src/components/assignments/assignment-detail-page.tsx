"use client";

import { useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { PaperBanner } from "@/components/assignments/paper-banner";
import { PaperRenderer } from "@/components/assignments/paper-renderer";
import { GenerationStatus } from "@/components/assignments/generation-status";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePaperStore } from "@/store/paper";
import { useAssignmentLive } from "@/store/realtime/hooks";

interface Props {
  id: string;
}

export function AssignmentDetailPage({ id }: Props) {
  const assignment = usePaperStore((s) => s.assignments[id]);
  const paper = usePaperStore((s) => s.papers[id]);
  const isLoadingAssignment = usePaperStore((s) => !!s.loading[`assignment:${id}`]);
  const assignmentError = usePaperStore((s) => s.errors[`assignment:${id}`]);
  const fetchAssignment = usePaperStore((s) => s.fetchAssignment);
  const fetchPaper = usePaperStore((s) => s.fetchPaper);

  // Live socket state for this assignment.
  const live = useAssignmentLive(id);
  const status = live?.status ?? assignment?.status;

  useEffect(() => {
    void fetchAssignment(id);
  }, [id, fetchAssignment]);

  // Fetch the paper whenever status flips to completed (and on first mount if
  // the doc was already completed when we arrived).
  useEffect(() => {
    if (status === "completed" && !paper) {
      void fetchPaper(id);
    }
  }, [status, paper, id, fetchPaper]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Topbar title="Create New" />

      <div className="flex flex-1 min-h-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {assignmentError && (
          <Alert variant="destructive">
            <AlertTitle>Could not load assignment</AlertTitle>
            <AlertDescription>{assignmentError}</AlertDescription>
          </Alert>
        )}

        {isLoadingAssignment && !assignment && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full shrink-0 rounded-2xl" />
            <Skeleton className="flex-1 min-h-0 w-full rounded-2xl" />
          </div>
        )}

        {assignment && (
          <>
            <div className="shrink-0">
              <PaperBanner assignment={assignment} status={status} />
            </div>

            {status !== "completed" && (
              <div className="shrink-0">
                <GenerationStatus
                  assignmentId={id}
                  status={status}
                  stage={live?.stage}
                  reason={live?.reason}
                />
              </div>
            )}

            {status === "completed" && paper && (
              <div className="flex-1 min-h-0">
                <PaperRenderer assignment={assignment} paper={paper} />
              </div>
            )}

            {status === "completed" && !paper && (
              <Skeleton className="flex-1 min-h-0 w-full rounded-2xl" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
