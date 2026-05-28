// Mirrors the Mongoose models in backend/src/models. Kept in sync manually
// for the MVP; promote to a shared workspace package later.

export type AssignmentStatus =
  | "draft"
  | "queued"
  | "generating"
  | "completed"
  | "failed";

export type QuestionType =
  | "mcq"
  | "short_answer"
  | "long_answer"
  | "true_false"
  | "fill_blank";

export type Difficulty = "easy" | "moderate" | "hard";

export interface DifficultyMix {
  easy: number;
  moderate: number;
  hard: number;
}

export interface QuestionConfig {
  type: QuestionType;
  count: number;
  marksPerQuestion: number;
  difficultyMix?: DifficultyMix;
}

export interface SourceMaterial {
  originalName?: string;
  mimeType?: string;
  bytes?: number;
  text?: string;
}

export interface Assignment {
  _id: string;
  teacherId?: string;
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  additionalInstructions?: string;
  questionConfigs: QuestionConfig[];
  sourceMaterial?: SourceMaterial;
  status: AssignmentStatus;
  currentJobId?: string;
  paperId?: string;
  failureReason?: string;
  attempts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaperChoice {
  label: string;
  text: string;
  isCorrect?: boolean;
}

export interface PaperQuestion {
  number: number;
  type: QuestionType;
  text: string;
  difficulty: Difficulty;
  marks: number;
  choices?: PaperChoice[];
  answer?: string;
  explanation?: string;
}

export interface PaperSection {
  label: string;
  title: string;
  instruction: string;
  totalMarks: number;
  questions: PaperQuestion[];
}

export interface QuestionPaper {
  _id: string;
  assignmentId: string;
  title: string;
  subject?: string;
  gradeLevel?: string;
  durationMinutes?: number;
  totalMarks: number;
  instructions: string[];
  sections: PaperSection[];
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Realtime event payloads — must mirror backend/src/realtime/events.ts
export interface ServerEvents {
  "assignment:status": { assignmentId: string; status: AssignmentStatus };
  "assignment:progress": { assignmentId: string; stage: string; pct?: number };
  "assignment:completed": { assignmentId: string; paperId: string };
  "assignment:failed": { assignmentId: string; reason: string };
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
  true_false: "True / False",
  fill_blank: "Fill in the Blank",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Challenging",
};
