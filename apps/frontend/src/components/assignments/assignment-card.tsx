"use client";

import Link from "next/link";
import { MoreVertical, Trash2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/lib/types";

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatDate = (iso: string) => fmt.format(new Date(iso)).replaceAll("/", "-");

const STATUS_LABEL: Record<Assignment["status"], string> = {
  draft: "Draft",
  queued: "Queued",
  generating: "Generating",
  completed: "Ready",
  failed: "Failed",
};

const STATUS_TONE: Record<Assignment["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  queued: "bg-amber-100 text-amber-800",
  generating: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

interface AssignmentCardProps {
  assignment: Assignment;
  onDelete: (assignment: Assignment) => void;
}

export function AssignmentCard({ assignment, onDelete }: AssignmentCardProps) {
  const isPending =
    assignment.status === "queued" || assignment.status === "generating";

  return (
    <Card className="group relative gap-0 overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/assignments/${assignment._id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold underline-offset-4 group-hover:underline">
            {assignment.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn("rounded-full text-[11px]", STATUS_TONE[assignment.status])}
          >
            {STATUS_LABEL[assignment.status]}
            {isPending && (
              <span className="ml-1 inline-block size-1 animate-pulse rounded-full bg-current" />
            )}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="More actions" />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem render={<Link href={`/assignments/${assignment._id}`} />}>
                <Eye />
                View Assignment
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(assignment);
                }}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground/70">Assigned on</span> :{" "}
          {formatDate(assignment.createdAt)}
        </span>
        <span>
          <span className="font-medium text-foreground/70">Due</span> :{" "}
          {formatDate(assignment.dueDate)}
        </span>
      </div>
    </Card>
  );
}
