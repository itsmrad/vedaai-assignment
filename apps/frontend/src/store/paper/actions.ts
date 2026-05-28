import { api, ApiError } from "@/lib/api";
import type { StoreSetter } from "@/store/types";
import type { PaperStore } from "@/store/paper";

type Setter = StoreSetter<PaperStore>;

export class PaperActionImpl {
  readonly #set: Setter;
  readonly #get: () => PaperStore;

  constructor(set: Setter, get: () => PaperStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  // Load the assignment metadata for the output page.
  fetchAssignment = async (id: string) => {
    this.#set((state) => ({
      loading: { ...state.loading, [`assignment:${id}`]: true },
      errors: { ...state.errors, [`assignment:${id}`]: null },
    }));
    try {
      const { assignment } = await api.getAssignment(id);
      this.#set((state) => ({
        assignments: { ...state.assignments, [id]: assignment },
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : String(err);
      this.#set((state) => ({
        errors: { ...state.errors, [`assignment:${id}`]: message },
      }));
    } finally {
      this.#set((state) => ({
        loading: { ...state.loading, [`assignment:${id}`]: false },
      }));
    }
  };

  // Load the generated paper. 404 is expected while generation is in flight.
  fetchPaper = async (id: string) => {
    this.#set((state) => ({
      loading: { ...state.loading, [`paper:${id}`]: true },
      errors: { ...state.errors, [`paper:${id}`]: null },
    }));
    try {
      const { paper } = await api.getPaper(id);
      this.#set((state) => ({
        papers: { ...state.papers, [id]: paper },
      }));
    } catch (err) {
      // 404 is normal pre-completion, suppress the error UI for it.
      if (err instanceof ApiError && err.status === 404) {
        this.#set((state) => ({
          errors: { ...state.errors, [`paper:${id}`]: null },
        }));
      } else {
        const message = err instanceof ApiError ? err.message : String(err);
        this.#set((state) => ({
          errors: { ...state.errors, [`paper:${id}`]: message },
        }));
      }
    } finally {
      this.#set((state) => ({
        loading: { ...state.loading, [`paper:${id}`]: false },
      }));
    }
  };

  setStudentInfo = (
    patch: Partial<{ name: string; rollNumber: string; section: string }>,
  ) => {
    this.#set((state) => ({
      studentInfo: { ...state.studentInfo, ...patch },
    }));
  };

  // Regenerate -> backend resets status to queued; live updates flow via socket.
  regenerate = async (id: string) => {
    await api.regenerate(id);
    // Drop the cached paper so the UI shows the regenerating state.
    this.#set((state) => {
      const { [id]: _drop, ...rest } = state.papers;
      void _drop;
      return { papers: rest };
    });
  };

  // Regenerate with section-level feedback comments.
  regenerateWithFeedback = async (id: string) => {
    const comments = this.#get().sectionComments[id];
    if (!comments || Object.keys(comments).length === 0) {
      return this.regenerate(id);
    }
    const feedback = Object.entries(comments).map(([sectionLabel, comment]) => ({
      sectionLabel,
      comment,
    }));
    await api.regenerateWithFeedback(id, feedback);
    // Drop cached paper + clear comments
    this.#set((state) => {
      const { [id]: _drop, ...restPapers } = state.papers;
      void _drop;
      const { [id]: _dropComments, ...restComments } = state.sectionComments;
      void _dropComments;
      return { papers: restPapers, sectionComments: restComments };
    });
  };

  // Section comment management
  addSectionComment = (assignmentId: string, sectionLabel: string, comment: string) => {
    this.#set((state) => ({
      sectionComments: {
        ...state.sectionComments,
        [assignmentId]: {
          ...state.sectionComments[assignmentId],
          [sectionLabel]: comment,
        },
      },
    }));
  };

  removeSectionComment = (assignmentId: string, sectionLabel: string) => {
    this.#set((state) => {
      const existing = state.sectionComments[assignmentId];
      if (!existing) return {};
      const { [sectionLabel]: _drop, ...rest } = existing;
      void _drop;
      const isEmpty = Object.keys(rest).length === 0;
      if (isEmpty) {
        const { [assignmentId]: _dropAll, ...restComments } = state.sectionComments;
        void _dropAll;
        return { sectionComments: restComments };
      }
      return {
        sectionComments: { ...state.sectionComments, [assignmentId]: rest },
      };
    });
  };

  clearComments = (assignmentId: string) => {
    this.#set((state) => {
      const { [assignmentId]: _drop, ...rest } = state.sectionComments;
      void _drop;
      return { sectionComments: rest };
    });
  };

  // PDF download with backend-driven polling. Returns the blob if ready.
  downloadPdf = async (id: string): Promise<Blob | null> => {
    this.#set((state) => ({
      pdfState: { ...state.pdfState, [id]: { kind: "rendering" } },
    }));
    try {
      // Up to 10 polls, ~15s budget.
      for (let i = 0; i < 10; i += 1) {
        const result = await api.fetchPdf(id, {
          studentName: this.#get().studentInfo.name || undefined,
          rollNumber: this.#get().studentInfo.rollNumber || undefined,
          section: this.#get().studentInfo.section || undefined,
        });
        if (result.status === "ready") {
          this.#set((state) => ({
            pdfState: { ...state.pdfState, [id]: { kind: "ready" } },
          }));
          return result.blob;
        }
        await new Promise((r) => setTimeout(r, result.retryAfterMs));
      }
      throw new Error("PDF render is taking longer than expected");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : String(err);
      this.#set((state) => ({
        pdfState: {
          ...state.pdfState,
          [id]: { kind: "error", message },
        },
      }));
      return null;
    }
  };
}

export type PaperAction = Pick<PaperActionImpl, keyof PaperActionImpl>;
