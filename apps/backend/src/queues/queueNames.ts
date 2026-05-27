// Centralised queue/job name registry to avoid magic strings drift.
export const QUEUE = {
  generation: "paper-generation",
  pdf: "paper-pdf",
} as const;

export const JOB = {
  generatePaper: "generate-paper",
  renderPdf: "render-pdf",
} as const;

// Job payload contracts
export interface GeneratePaperJobData {
  assignmentId: string;
}

export interface RenderPdfJobData {
  assignmentId: string;
  paperId: string;
  studentInfo?: { name?: string; rollNumber?: string; section?: string };
}
