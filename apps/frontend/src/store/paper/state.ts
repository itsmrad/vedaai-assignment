import type { Assignment, QuestionPaper } from "@/lib/types";

export interface PaperState {
  // Per-assignment fetched paper. Keyed by assignment id.
  papers: Record<string, QuestionPaper>;
  assignments: Record<string, Assignment>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  // Student info input shared across the output page (not persisted).
  studentInfo: { name: string; rollNumber: string; section: string };
  // Pdf download state per assignment id
  pdfState: Record<
    string,
    | { kind: "idle" }
    | { kind: "rendering" }
    | { kind: "ready" }
    | { kind: "error"; message: string }
  >;
  // Section-level feedback comments for regeneration.
  // Outer key: assignmentId, inner key: sectionLabel, value: comment text.
  sectionComments: Record<string, Record<string, string>>;
}

export const initialState: PaperState = {
  papers: {},
  assignments: {},
  loading: {},
  errors: {},
  studentInfo: { name: "", rollNumber: "", section: "" },
  pdfState: {},
  sectionComments: {},
};
