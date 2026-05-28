"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePaperStore } from "@/store/paper";
import type { Assignment, Difficulty, QuestionPaper } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, MessageSquareX, MessageSquare } from "lucide-react";

interface Props {
  assignment: Assignment;
  paper: QuestionPaper;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Challenging",
};

const DIFFICULTY_TONE: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  hard: "bg-rose-100 text-rose-800",
};

export function PaperRenderer({ assignment, paper }: Props) {
  const studentInfo = usePaperStore((s) => s.studentInfo);
  const setStudentInfo = usePaperStore((s) => s.setStudentInfo);
  const comments = usePaperStore((s) => s.sectionComments[assignment._id]) ?? {};
  const addSectionComment = usePaperStore((s) => s.addSectionComment);
  const removeSectionComment = usePaperStore((s) => s.removeSectionComment);

  const [commentDialog, setCommentDialog] = useState<{
    open: boolean;
    sectionLabel: string;
    sectionTitle: string;
  }>({ open: false, sectionLabel: "", sectionTitle: "" });
  const [commentText, setCommentText] = useState("");

  const hasAnswerKey = paper.sections.some((s) =>
    s.questions.some((q) => q.answer || q.explanation),
  );

  const openCommentDialog = (sectionLabel: string, sectionTitle: string) => {
    setCommentText(comments[sectionLabel] ?? "");
    setCommentDialog({ open: true, sectionLabel, sectionTitle });
  };

  const saveComment = () => {
    if (commentText.trim()) {
      addSectionComment(assignment._id, commentDialog.sectionLabel, commentText.trim());
    }
    setCommentDialog({ open: false, sectionLabel: "", sectionTitle: "" });
    setCommentText("");
  };

  return (
    <>
      <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto">
          <article className="flex flex-col gap-8 p-6 sm:p-10 lg:p-14 [font-family:Georgia,'Times_New_Roman',serif]">
            {/* Header */}
          <header className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {paper.title}
            </h1>
            {paper.subject && (
              <p className="text-base sm:text-lg">
                <span className="font-semibold">Subject:</span> {paper.subject}
              </p>
            )}
            {paper.gradeLevel && (
              <p className="text-base sm:text-lg">
                <span className="font-semibold">Class:</span> {paper.gradeLevel}
              </p>
            )}
          </header>

          {/* Time + marks row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            {paper.durationMinutes ? (
              <span>
                <span className="font-semibold">Time Allowed:</span>{" "}
                {paper.durationMinutes} minutes
              </span>
            ) : (
              <span />
            )}
            <span>
              <span className="font-semibold">Maximum Marks:</span> {paper.totalMarks}
            </span>
          </div>

          {/* General instructions */}
          {paper.instructions.length > 0 && (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-semibold">All instructions are compulsory unless stated otherwise.</p>
              <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
                {paper.instructions.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Student info */}
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <StudentField
              label="Name"
              value={studentInfo.name}
              onChange={(v) => setStudentInfo({ name: v })}
            />
            <StudentField
              label="Roll Number"
              value={studentInfo.rollNumber}
              onChange={(v) => setStudentInfo({ rollNumber: v })}
            />
            <StudentField
              label="Section"
              value={studentInfo.section}
              onChange={(v) => setStudentInfo({ section: v })}
            />
          </div>

          {/* Sections — each wrapped in a context menu */}
          <div className="flex flex-col gap-10">
            {paper.sections.map((section) => {
              const hasComment = !!comments[section.label];

              return (
                <ContextMenu key={section.label}>
                  <ContextMenuTrigger
                    render={
                      <section
                        className={cn(
                          "relative flex flex-col gap-4 rounded-lg p-3 -m-3 transition-colors",
                          hasComment && "ring-2 ring-brand/30 bg-brand/[0.02]",
                        )}
                      />
                    }
                  >
                    {/* Comment indicator */}
                    {hasComment && (
                      <div className="absolute -right-1 -top-1 flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground shadow-sm">
                        <MessageSquare className="size-3" />
                        Feedback
                      </div>
                    )}

                    <header className="flex flex-col items-center gap-1 text-center">
                      <h2 className="text-xl font-bold tracking-tight">
                        Section {section.label}
                      </h2>
                      <p className="text-sm font-semibold">{section.title}</p>
                      <p className="text-sm italic text-muted-foreground">
                        {section.instruction}
                      </p>
                    </header>

                    {/* Show the comment text if one exists */}
                    {hasComment && (
                      <div className="flex items-start gap-2 rounded-lg bg-brand/5 px-3 py-2 text-sm">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-brand" />
                        <p className="text-muted-foreground italic">
                          &ldquo;{comments[section.label]}&rdquo;
                        </p>
                      </div>
                    )}

                    <ol className="flex flex-col gap-5 [counter-reset:question]">
                      {section.questions.map((q) => (
                        <li
                          key={q.number}
                          className="flex flex-col gap-2 [counter-increment:question]"
                        >
                          <div className="flex items-start gap-3 text-[15px] leading-relaxed">
                            <span className="shrink-0 font-semibold">{q.number}.</span>
                            <div className="flex-1">
                              <span>{q.text}</span>
                              <span className="ml-2 text-muted-foreground">
                                [{q.marks} {q.marks === 1 ? "Mark" : "Marks"}]
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "ml-2 align-middle text-[11px]",
                                  DIFFICULTY_TONE[q.difficulty],
                                )}
                              >
                                {DIFFICULTY_LABELS[q.difficulty]}
                              </Badge>
                            </div>
                          </div>

                          {q.choices && q.choices.length > 0 && (
                            <ol className="ml-8 list-[upper-alpha] space-y-1.5 text-[14px] text-muted-foreground">
                              {q.choices.map((c, idx) => (
                                <li key={idx}>{c.text}</li>
                              ))}
                            </ol>
                          )}
                        </li>
                      ))}
                    </ol>
                  </ContextMenuTrigger>

                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => openCommentDialog(section.label, section.title)}
                    >
                      <MessageSquarePlus className="mr-2 size-4" />
                      {hasComment ? "Edit Comment" : "Add Comment"}
                    </ContextMenuItem>
                    {hasComment && (
                      <ContextMenuItem
                        onClick={() => removeSectionComment(assignment._id, section.label)}
                        variant="destructive"
                      >
                        <MessageSquareX className="mr-2 size-4" />
                        Remove Comment
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>

          <p className="border-t border-border pt-4 text-sm font-semibold">
            End of Question Paper
          </p>

          {/* Answer key */}
          {hasAnswerKey && (
            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-bold tracking-tight">Answer Key:</h3>
              <ol className="ml-5 list-decimal space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                {paper.sections.flatMap((s) =>
                  s.questions
                    .filter((q) => q.answer || q.explanation)
                    .map((q) => (
                      <li key={`${s.label}-${q.number}`} className="text-foreground/90">
                        {q.answer ?? q.explanation}
                        {q.answer && q.explanation && (
                          <p className="mt-1 text-muted-foreground">{q.explanation}</p>
                        )}
                      </li>
                    )),
                )}
              </ol>
            </section>
          )}

          {/* Provenance footer */}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              Created for assignment{" "}
              <span className="font-mono">{assignment._id.slice(-8)}</span>
            </span>
            {paper.generatedAt && (
              <span>
                Generated{" "}
                {new Date(paper.generatedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {paper.model && ` · ${paper.model}`}
              </span>
            )}
          </footer>
        </article>
        </div>
      </Card>

      {/* Comment Dialog */}
      <Dialog
        open={commentDialog.open}
        onOpenChange={(open) => {
          if (!open) setCommentDialog({ open: false, sectionLabel: "", sectionTitle: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Feedback for Section {commentDialog.sectionLabel}
            </DialogTitle>
            <DialogDescription>
              Add your feedback for this section. The AI will incorporate your comments
              when regenerating the paper.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="e.g. Make the questions more application-based, reduce difficulty, add more MCQs..."
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCommentDialog({ open: false, sectionLabel: "", sectionTitle: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={saveComment} disabled={!commentText.trim()}>
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StudentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-baseline gap-2 border-b border-foreground/30 pb-1">
      <span className="font-semibold whitespace-nowrap">{label}:</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
    </label>
  );
}
