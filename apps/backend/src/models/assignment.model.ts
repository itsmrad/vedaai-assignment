import { Schema, model, type InferSchemaType, type Model } from "mongoose";

// Status lifecycle drives realtime UI state
export const ASSIGNMENT_STATUSES = [
  "draft",       // created but not yet enqueued
  "queued",      // job placed on BullMQ
  "generating", // worker actively running
  "completed",   // paper is ready
  "failed",      // worker exhausted retries
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const QUESTION_TYPES = [
  "mcq",
  "short_answer",
  "long_answer",
  "true_false",
  "fill_blank",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ["easy", "moderate", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// Per-type breakdown the teacher specifies on the form.
// Embedded since it is small, bounded, and always read with the parent.
const QuestionConfigSchema = new Schema(
  {
    type: { type: String, enum: QUESTION_TYPES, required: true },
    count: { type: Number, required: true, min: 1, max: 100 },
    marksPerQuestion: { type: Number, required: true, min: 1, max: 100 },
    difficultyMix: {
      easy: { type: Number, default: 0, min: 0, max: 100 },
      moderate: { type: Number, default: 0, min: 0, max: 100 },
      hard: { type: Number, default: 0, min: 0, max: 100 },
    },
  },
  { _id: false },
);

// Source material extracted from optional uploaded PDF/text.
// We store the parsed text inline (capped) so the upload file can be ephemeral.
const SourceMaterialSchema = new Schema(
  {
    originalName: { type: String },
    mimeType: { type: String },
    bytes: { type: Number },
    // Cap kept under ~200KB to stay well below 16MB doc limit and prompt budget
    text: { type: String, maxlength: 200_000 },
  },
  { _id: false },
);

const AssignmentSchema = new Schema(
  {
    // Placeholder until better-auth integration; non-required so MVP can run
    teacherId: { type: String, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, trim: true, maxlength: 100 },
    gradeLevel: { type: String, trim: true, maxlength: 50 },

    dueDate: { type: Date, required: true },
    additionalInstructions: { type: String, maxlength: 2_000 },

    questionConfigs: {
      type: [QuestionConfigSchema],
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length > 0,
        message: "At least one question config is required",
      },
    },

    sourceMaterial: SourceMaterialSchema,

    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: "draft",
      index: true,
    },

    // Linkage to the active job + generated paper.
    // Job id stored as string (BullMQ uses string ids).
    currentJobId: { type: String, index: true },
    paperId: { type: Schema.Types.ObjectId, ref: "QuestionPaper" },

    // Failure context for the UI when status === 'failed'
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },

    // Transient teacher feedback for regeneration; cleared after generation completes
    regenerationFeedback: {
      type: [
        {
          sectionLabel: { type: String },
          questionNumber: { type: Number }, // Optional: references specific question in section
          comment: { type: String },
        },
      ],
      default: undefined,
    },

    // Schema-versioning pattern for safe future migrations
    schemaVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// Compound index for the dashboard list view: teacher + recency
AssignmentSchema.index({ teacherId: 1, createdAt: -1 });

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & { _id: unknown };
export type AssignmentModel = Model<AssignmentDoc>;

export const Assignment: AssignmentModel = model<AssignmentDoc>("Assignment", AssignmentSchema);
