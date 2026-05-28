"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Topbar } from "@/components/dashboard/topbar";
import { AssignmentCard } from "@/components/assignments/assignment-card";
import { AssignmentsEmptyState } from "@/components/assignments/empty-state";
import { AssignmentListToolbar } from "@/components/assignments/assignment-list-toolbar";
import { DeleteAssignmentDialog } from "@/components/assignments/delete-dialog";
import { useAssignmentsStore } from "@/store/assignments";
import type { Assignment } from "@/lib/types";
import { toast } from "sonner";

export function AssignmentsPage() {
  const { isFetching, initialized, fetchError, search, orderedIds, assignmentsMap } =
    useAssignmentsStore();
  const initialize = useAssignmentsStore((s) => s.initialize);

  const [pendingDelete, setPendingDelete] = useState<Assignment | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (fetchError) toast.error(fetchError);
  }, [fetchError]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = orderedIds
      .map((id) => assignmentsMap[id])
      .filter((a): a is Assignment => Boolean(a));
    if (!q) return items;
    return items.filter((a) => a.title.toLowerCase().includes(q));
  }, [orderedIds, assignmentsMap, search]);

  const isEmpty = initialized && orderedIds.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar />

      {/* loading skeleton */}
      {!initialized && isFetching && (
        <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto p-6 lg:p-8">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* empty state (matches Figma "0 State screen") */}
      {isEmpty && (
        <div className="flex flex-1 min-h-0 items-center justify-center overflow-y-auto p-6">
          <AssignmentsEmptyState />
        </div>
      )}

      {/* filled state */}
      {initialized && orderedIds.length > 0 && (
        <div className="relative flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto p-6 lg:p-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
            <p className="text-sm text-muted-foreground">
              Manage and create assignments for your classes.
            </p>
          </header>

          <AssignmentListToolbar />

          <div className="grid gap-4 pb-24 sm:grid-cols-2">
            {visible.map((a) => (
              <AssignmentCard
                key={a._id}
                assignment={a}
                onDelete={setPendingDelete}
              />
            ))}
            {visible.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                No assignments match &ldquo;{search}&rdquo;.
              </p>
            )}
          </div>

          <div className="pointer-events-none sticky bottom-6 left-0 right-0 z-10 flex justify-center pt-12 [background:linear-gradient(to_top,var(--color-card)_40%,transparent)]">
            <Button
              size="lg"
              nativeButton={false}
              className="pointer-events-auto h-11 gap-2 rounded-full bg-foreground px-5 text-background shadow-lg hover:bg-foreground/90 [a]:hover:bg-foreground/90"
              render={<Link href="/assignments/new" />}
            >
              <Plus data-icon="inline-start" />
              Create Assignment
            </Button>
          </div>
        </div>
      )}

      <DeleteAssignmentDialog
        assignmentId={pendingDelete?._id ?? null}
        title={pendingDelete?.title}
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </div>
  );
}
