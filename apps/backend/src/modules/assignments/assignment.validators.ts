import { z } from "zod";
import { QUESTION_TYPES } from "~/models/assignment.model";

const DifficultyMix = z
  .object({
    easy: z.number().int().min(0).max(100).default(0),
    moderate: z.number().int().min(0).max(100).default(0),
    hard: z.number().int().min(0).max(100).default(0),
  })
  .refine((m) => m.easy + m.moderate + m.hard === 100, {
    message: "difficultyMix must sum to 100",
  });

const QuestionConfig = z.object({
  type: z.enum(QUESTION_TYPES),
  count: z.number().int().min(1).max(100),
  marksPerQuestion: z.number().int().min(1).max(100),
  difficultyMix: DifficultyMix.optional(),
});

// Multipart form body arrives as strings; coerce numbers and parse JSON arrays.
// Accepts both: JSON body (application/json) and multipart with `questionConfigs`
// as a JSON-encoded string field.
export const CreateAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(50).optional(),
  dueDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: "dueDate must be in the future",
  }),
  additionalInstructions: z.string().max(2_000).optional(),
  questionConfigs: z
    .union([z.array(QuestionConfig), z.string()])
    .transform((val, ctx): z.infer<typeof QuestionConfig>[] => {
      if (typeof val !== "string") return val;
      try {
        const parsed = JSON.parse(val);
        const result = z.array(QuestionConfig).safeParse(parsed);
        if (!result.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "questionConfigs is not a valid array",
          });
          return z.NEVER;
        }
        return result.data;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "questionConfigs must be JSON" });
        return z.NEVER;
      }
    })
    .pipe(z.array(QuestionConfig).min(1, "At least one question config required")),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

const FeedbackItem = z.object({
  sectionLabel: z.string().max(8),
  questionNumber: z.number().int().min(1).optional(), // Optional: if provided, references a specific question
  comment: z.string().max(2000),
});

export const RegenerateSchema = z.object({
  feedback: z.array(FeedbackItem).max(20).optional(),
});

export type RegenerateInput = z.infer<typeof RegenerateSchema>;

export const PdfQuerySchema = z.object({
  studentName: z.string().max(120).optional(),
  rollNumber: z.string().max(40).optional(),
  section: z.string().max(40).optional(),
});
export type PdfQuery = z.infer<typeof PdfQuerySchema>;
