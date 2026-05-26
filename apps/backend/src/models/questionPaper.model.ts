import { Schema, model, type InferSchemaType, type Model } from "mongoose";
import { DIFFICULTIES, QUESTION_TYPES } from "~/models/assignment.model";

// A paper is the structured AI output, persisted exactly as parsed.
// Sections + questions are bounded by user input (sane caps), so embedding
// is the right choice -- always read together with the paper.

const ChoiceSchema = new Schema(
  {
    label: { type: String, required: true, maxlength: 4 }, // "A", "B"
    text: { type: String, required: true, maxlength: 1_000 },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
);

const QuestionSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1 },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    text: { type: String, required: true, maxlength: 4_000 },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    marks: { type: Number, required: true, min: 1, max: 100 },
    // Optional fields by question type
    choices: { type: [ChoiceSchema], default: undefined },
    answer: { type: String, maxlength: 4_000 },
    explanation: { type: String, maxlength: 4_000 },
  },
  { _id: false },
);

const SectionSchema = new Schema(
  {
    label: { type: String, required: true, maxlength: 8 }, // "A", "B"
    title: { type: String, required: true, maxlength: 200 },
    instruction: { type: String, required: true, maxlength: 500 },
    totalMarks: { type: Number, required: true, min: 0 },
    questions: { type: [QuestionSchema], required: true },
  },
  { _id: false },
);

const QuestionPaperSchema = new Schema(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
      unique: true, // one active paper per assignment; regeneration replaces it
    },
    title: { type: String, required: true, maxlength: 200 },
    subject: { type: String, maxlength: 100 },
    gradeLevel: { type: String, maxlength: 50 },
    durationMinutes: { type: Number, min: 1, max: 600 },
    totalMarks: { type: Number, required: true, min: 0 },
    instructions: { type: [String], default: [] },
    sections: { type: [SectionSchema], required: true },

    // Provenance for debugging/regeneration
    model: { type: String },
    promptVersion: { type: String },
    generatedAt: { type: Date, default: Date.now },

    schemaVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export type QuestionPaperDoc = InferSchemaType<typeof QuestionPaperSchema> & { _id: unknown };
export type QuestionPaperModel = Model<QuestionPaperDoc>;

export const QuestionPaper: QuestionPaperModel = model<QuestionPaperDoc>(
  "QuestionPaper",
  QuestionPaperSchema,
);
