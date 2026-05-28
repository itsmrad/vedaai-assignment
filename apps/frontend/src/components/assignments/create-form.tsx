"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { CalendarIcon, Plus, Trash2, Upload, X, BookOpen, ListChecks, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/types";
import { toast } from "sonner";

const QUESTION_TYPES: QuestionType[] = [
  "mcq",
  "short_answer",
  "long_answer",
  "true_false",
  "fill_blank",
];

// Zod mirrors the backend validators.
const QuestionConfigSchema = z
  .object({
    type: z.enum(QUESTION_TYPES as [QuestionType, ...QuestionType[]]),
    count: z.coerce.number().int().min(1).max(100),
    marksPerQuestion: z.coerce.number().int().min(1).max(100),
    easy: z.coerce.number().int().min(0).max(100).default(50),
    moderate: z.coerce.number().int().min(0).max(100).default(50),
    hard: z.coerce.number().int().min(0).max(100).default(0),
  })
  .refine((m) => m.easy + m.moderate + m.hard === 100, {
    message: "Difficulty mix must sum to 100",
    path: ["easy"],
  });

const FormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(50).optional(),
  dueDate: z
    .date({ message: "Pick a due date" })
    .refine((d) => d.getTime() > Date.now(), {
      message: "Due date must be in the future",
    }),
  additionalInstructions: z.string().max(2_000).optional(),
  questionConfigs: z.array(QuestionConfigSchema).min(1, "Add at least one question type"),
  source: z
    .instanceof(File)
    .optional()
    .refine((f) => !f || f.size <= 10 * 1024 * 1024, "Max file size is 10MB")
    .refine(
      (f) => !f || ["application/pdf", "text/plain"].includes(f.type),
      "Only PDF or .txt is allowed",
    ),
});

// Inputs (raw form values) and outputs (post-zod-coercion). RHF needs both
// because z.coerce.number turns the input shape into `unknown`.
type FormInput = z.input<typeof FormSchema>;
type FormOutput = z.output<typeof FormSchema>;

const DEFAULT_CONFIG: FormInput["questionConfigs"][number] = {
  type: "mcq",
  count: 5,
  marksPerQuestion: 2,
  easy: 50,
  moderate: 50,
  hard: 0,
};

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-500",
  moderate: "bg-amber-500",
  hard: "bg-rose-500",
};

function QuestionTypeSelect({
  control,
  index,
  onChange,
}: {
  control: Control<FormInput>;
  index: number;
  onChange: (v: QuestionType) => void;
}) {
  const value = useWatch({ control, name: `questionConfigs.${index}.type` });
  return (
    <Select value={value} onValueChange={(v) => onChange(v as QuestionType)}>
      <SelectTrigger>
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {QUESTION_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function DifficultyBar({
  easy,
  moderate,
  hard,
}: {
  easy: number;
  moderate: number;
  hard: number;
}) {
  const total = easy + moderate + hard;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
        {easy > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${(easy / total) * 100}%` }}
          />
        )}
        {moderate > 0 && (
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${(moderate / total) * 100}%` }}
          />
        )}
        {hard > 0 && (
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${(hard / total) * 100}%` }}
          />
        )}
      </div>
      <span className={cn("text-xs tabular-nums", total !== 100 && "text-destructive font-medium")}>
        {total}%
      </span>
    </div>
  );
}

export function CreateAssignmentForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      subject: "",
      gradeLevel: "",
      additionalInstructions: "",
      questionConfigs: [DEFAULT_CONFIG],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questionConfigs",
  });

  const configs = useWatch({
    control: form.control,
    name: "questionConfigs",
  });

  const totalMarks = configs.reduce(
    (sum, c) =>
      sum + (Number(c?.count) || 0) * (Number(c?.marksPerQuestion) || 0),
    0,
  );

  const totalQuestions = configs.reduce(
    (sum, c) => sum + (Number(c?.count) || 0),
    0,
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("title", values.title);
      if (values.subject) fd.set("subject", values.subject);
      if (values.gradeLevel) fd.set("gradeLevel", values.gradeLevel);
      fd.set("dueDate", values.dueDate.toISOString());
      if (values.additionalInstructions)
        fd.set("additionalInstructions", values.additionalInstructions);

      const cfgs = values.questionConfigs.map((c) => ({
        type: c.type,
        count: c.count,
        marksPerQuestion: c.marksPerQuestion,
        difficultyMix: { easy: c.easy, moderate: c.moderate, hard: c.hard },
      }));
      fd.set("questionConfigs", JSON.stringify(cfgs));

      if (values.source) fd.set("source", values.source);

      const { assignment } = await api.createAssignment(fd);
      toast.success("Assignment queued — generating now");
      router.push(`/assignments/${assignment._id}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to create assignment";
      toast.error(message);
      setSubmitting(false);
    }
  });

  const sourceFile = useWatch({ control: form.control, name: "source" });
  const dueDate = useWatch({ control: form.control, name: "dueDate" });

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <div className="flex flex-col gap-10 p-6 lg:p-8">
      {/* Section 1: Basic Info */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="size-4" />
          <span>Basic Information</span>
        </div>

        <FieldGroup>
          <Field data-invalid={!!form.formState.errors.title}>
            <FieldLabel htmlFor="title">Assignment Title</FieldLabel>
            <Input
              id="title"
              placeholder="e.g. Chapter 4: Electricity"
              aria-invalid={!!form.formState.errors.title}
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="subject">Subject</FieldLabel>
              <Input id="subject" placeholder="Science" {...form.register("subject")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="gradeLevel">Grade / Class</FieldLabel>
              <Input
                id="gradeLevel"
                placeholder="Class 8"
                {...form.register("gradeLevel")}
              />
            </Field>
          </div>

          <Field data-invalid={!!form.formState.errors.dueDate}>
            <FieldLabel>Due Date</FieldLabel>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start gap-2 text-left font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) =>
                    d && form.setValue("dueDate", d, { shouldValidate: true })
                  }
                  disabled={(d) => d < new Date()}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.dueDate && (
              <FieldError>{form.formState.errors.dueDate.message}</FieldError>
            )}
          </Field>
        </FieldGroup>
      </div>

      <div className="h-px bg-border/60" />

      {/* Section 2: Question Configuration */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ListChecks className="size-4" />
          <span>Question Configuration</span>
        </div>

        <FieldSet>
          <FieldLegend className="sr-only">Question Types</FieldLegend>
          <FieldDescription>
            Define how many questions of each type and the difficulty mix.
          </FieldDescription>

          <div className="flex flex-col gap-4">
            {fields.map((field, idx) => {
              const easy = Number(configs[idx]?.easy) || 0;
              const moderate = Number(configs[idx]?.moderate) || 0;
              const hard = Number(configs[idx]?.hard) || 0;

              return (
                <div
                  key={field.id}
                  className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Section {idx + 1}</h3>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field>
                      <FieldLabel>Type</FieldLabel>
                      <QuestionTypeSelect control={form.control} index={idx} onChange={(v) => form.setValue(`questionConfigs.${idx}.type`, v)} />
                    </Field>

                    <Field>
                      <FieldLabel>Count</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...form.register(`questionConfigs.${idx}.count`)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Marks each</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...form.register(`questionConfigs.${idx}.marksPerQuestion`)}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      data-invalid={!!form.formState.errors.questionConfigs?.[idx]?.easy}
                    >
                      <FieldLabel className="flex items-center gap-1.5">
                        <span className={cn("inline-block size-2 rounded-full", DIFFICULTY_COLORS.easy)} />
                        Easy %
                      </FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...form.register(`questionConfigs.${idx}.easy`)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5">
                        <span className={cn("inline-block size-2 rounded-full", DIFFICULTY_COLORS.moderate)} />
                        Moderate %
                      </FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...form.register(`questionConfigs.${idx}.moderate`)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5">
                        <span className={cn("inline-block size-2 rounded-full", DIFFICULTY_COLORS.hard)} />
                        Hard %
                      </FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...form.register(`questionConfigs.${idx}.hard`)}
                      />
                    </Field>
                  </div>

                  <DifficultyBar easy={easy} moderate={moderate} hard={hard} />

                  {form.formState.errors.questionConfigs?.[idx]?.easy && (
                    <FieldError>
                      {form.formState.errors.questionConfigs[idx]!.easy!.message}
                    </FieldError>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => append({ ...DEFAULT_CONFIG })}
          >
            <Plus data-icon="inline-start" />
            Add another section
          </Button>
        </FieldSet>
      </div>

      {form.formState.errors.questionConfigs?.message && (
        <Alert variant="destructive">
          <AlertTitle>Add at least one question type</AlertTitle>
          <AlertDescription>
            {form.formState.errors.questionConfigs.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="h-px bg-border/60" />

      {/* Section 3: Additional Settings */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="size-4" />
          <span>Additional Settings</span>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>Source Material (optional)</FieldLabel>
            <FieldDescription>
              Upload a PDF or .txt file with reference material the AI should base
              questions on.
            </FieldDescription>
            {sourceFile ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10">
                    <Upload className="size-4 text-brand" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{sourceFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.ceil(sourceFile.size / 1024)} KB
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => form.setValue("source", undefined as never)}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="source"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/10 px-4 py-8 text-sm text-muted-foreground transition-all hover:border-brand/40 hover:bg-brand/5"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-4" />
                </div>
                <div className="text-center">
                  <span className="font-medium text-foreground">Drop a file</span>
                  {" "}or click to upload
                </div>
                <span className="text-xs">PDF or TXT, max 10 MB</span>
                <input
                  id="source"
                  type="file"
                  accept="application/pdf,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) form.setValue("source", f, { shouldValidate: true });
                  }}
                />
              </label>
            )}
            {form.formState.errors.source && (
              <FieldError>{form.formState.errors.source.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="additionalInstructions">
              Additional Instructions
            </FieldLabel>
            <Textarea
              id="additionalInstructions"
              placeholder="e.g. Keep questions student-friendly, focus on conceptual understanding"
              rows={3}
              {...form.register("additionalInstructions")}
            />
          </Field>
        </FieldGroup>
      </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border/60 bg-card/90 px-6 py-4 backdrop-blur-sm lg:px-8">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{totalQuestions}</span> questions
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="font-semibold text-foreground">{totalMarks}</span> marks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Assignment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
