import { z } from "zod";
import { DIFFICULTIES, QUESTION_TYPES } from "~/models/assignment.model";

// Zod schema fed to Vercel AI SDK `generateObject`.
// This is the contract -- the model cannot return free text outside of these fields.
//
// IMPORTANT: OpenAI's strict structured outputs mode (default for generateObject)
// requires every property to be in `required`. Optional fields must be expressed
// as `.nullable()` so the JSON schema becomes `type: ["T", "null"]`. We strip
// nulls back to undefined in the generator before persisting.

export const ChoiceSchema = z.object({
  label: z.string().max(4),
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean().nullable(),
});

export const QuestionSchema = z.object({
  number: z.number().int().min(1),
  type: z.enum(QUESTION_TYPES),
  text: z.string().min(1).max(4000),
  difficulty: z.enum(DIFFICULTIES),
  marks: z.number().int().min(1).max(100),
  // Nullable, not optional, to satisfy OpenAI strict mode.
  choices: z.array(ChoiceSchema).nullable(),
  answer: z.string().max(4000).nullable(),
  explanation: z.string().max(4000).nullable(),
});

export const SectionSchema = z.object({
  label: z.string().min(1).max(8),
  title: z.string().min(1).max(200),
  instruction: z.string().min(1).max(500),
  totalMarks: z.number().int().min(0),
  questions: z.array(QuestionSchema).min(1),
});

export const QuestionPaperAISchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(100).nullable(),
  gradeLevel: z.string().max(50).nullable(),
  durationMinutes: z.number().int().min(1).max(600).nullable(),
  totalMarks: z.number().int().min(0),
  instructions: z.array(z.string().max(500)),
  sections: z.array(SectionSchema).min(1),
});

export type QuestionPaperAI = z.infer<typeof QuestionPaperAISchema>;

// Normalised shape for persistence: nulls collapsed to undefined and
// empty arrays kept as empty arrays.
export interface NormalisedPaper {
  title: string;
  subject?: string;
  gradeLevel?: string;
  durationMinutes?: number;
  totalMarks: number;
  instructions: string[];
  sections: Array<{
    label: string;
    title: string;
    instruction: string;
    totalMarks: number;
    questions: Array<{
      number: number;
      type: QuestionPaperAI["sections"][number]["questions"][number]["type"];
      text: string;
      difficulty: QuestionPaperAI["sections"][number]["questions"][number]["difficulty"];
      marks: number;
      choices?: Array<{ label: string; text: string; isCorrect?: boolean }>;
      answer?: string;
      explanation?: string;
    }>;
  }>;
}

const undef = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);

// Strip nulls back to undefined so the Mongoose schema treats them as missing.
export function normalisePaper(p: QuestionPaperAI): NormalisedPaper {
  return {
    title: p.title,
    subject: undef(p.subject),
    gradeLevel: undef(p.gradeLevel),
    durationMinutes: undef(p.durationMinutes),
    totalMarks: p.totalMarks,
    instructions: p.instructions,
    sections: p.sections.map((s) => ({
      label: s.label,
      title: s.title,
      instruction: s.instruction,
      totalMarks: s.totalMarks,
      questions: s.questions.map((q) => ({
        number: q.number,
        type: q.type,
        text: q.text,
        difficulty: q.difficulty,
        marks: q.marks,
        choices: q.choices
          ? q.choices.map((c) => ({
              label: c.label,
              text: c.text,
              isCorrect: undef(c.isCorrect),
            }))
          : undefined,
        answer: undef(q.answer),
        explanation: undef(q.explanation),
      })),
    })),
  };
}
