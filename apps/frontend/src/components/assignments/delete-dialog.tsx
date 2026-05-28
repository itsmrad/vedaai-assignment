"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAssignmentsStore } from "@/store/assignments";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  assignmentId: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAssignmentDialog({
  assignmentId,
  title,
  open,
  onOpenChange,
}: Props) {
  const deleteAssignment = useAssignmentsStore((s) => s.deleteAssignment);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    if (!assignmentId) return;
    setPending(true);
    try {
      await deleteAssignment(assignmentId);
      toast.success("Assignment deleted");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete assignment";
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
          <AlertDialogDescription>
            {title ? (
              <>
                <span className="font-medium text-foreground">{title}</span>{" "}
                and its generated paper will be permanently removed. This
                can&apos;t be undone.
              </>
            ) : (
              "This assignment and its generated paper will be permanently removed. This can't be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
