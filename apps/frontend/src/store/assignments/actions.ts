// Class-based actions per the LobeHub Zustand skill.
// Public actions (verb-first), internal actions (`internal_*`), and dispatch
// methods (`internal_dispatch*`) form three layers.

import { api, ApiError } from "@/lib/api";
import type { AssignmentStatus } from "@/lib/types";
import type { StoreSetter } from "@/store/types";
import type { AssignmentsStore } from "@/store/assignments";
import {
  type AssignmentAction,
  assignmentReducer,
} from "@/store/assignments/reducers";

type Setter = StoreSetter<AssignmentsStore>;

export class AssignmentsActionImpl {
  readonly #set: Setter;
  readonly #get: () => AssignmentsStore;

  constructor(set: Setter, get: () => AssignmentsStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  // ---------- public actions ----------

  fetchAssignments = async () => {
    if (this.#get().isFetching) return;
    this.#set({ isFetching: true, fetchError: null });
    try {
      const { items } = await api.listAssignments();
      this.internal_dispatchAssignments(
        { type: "setMany", items },
        "fetchAssignments",
      );
      this.#set({ initialized: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : String(err);
      this.#set({ fetchError: message });
    } finally {
      this.#set({ isFetching: false });
    }
  };

  initialize = async () => {
    if (this.#get().initialized || this.#get().isInitializing) return;
    this.#set({ isInitializing: true });
    await this.fetchAssignments();
    this.#set({ isInitializing: false });
  };

  setSearch = (search: string) => {
    this.#set({ search });
  };

  setContextMenuId = (id: string | null) => {
    this.#set({ contextMenuId: id });
  };

  // ---------- destructive ----------

  deleteAssignment = async (id: string) => {
    // Optimistic remove from list. If the API call fails, restore.
    const previous = this.#get().assignmentsMap[id];
    this.internal_dispatchAssignments({ type: "remove", id }, "deleteAssignment.optimistic");
    try {
      await api.deleteAssignment(id);
    } catch (err) {
      // Restore on failure so the UI doesn't lie about the delete succeeding.
      if (previous) {
        this.internal_dispatchAssignments(
          { type: "upsert", item: previous },
          "deleteAssignment.restore",
        );
      }
      throw err;
    }
  };

  // ---------- internal: applied by realtime events ----------

  internal_setStatus = (
    id: string,
    status: AssignmentStatus,
    failureReason?: string,
  ) => {
    this.internal_dispatchAssignments(
      { type: "setStatus", id, status, failureReason },
      "internal_setStatus",
    );
  };

  // ---------- dispatch ----------

  internal_dispatchAssignments = (action: AssignmentAction, _label?: string) => {
    void _label;
    this.#set((state) => assignmentReducer(state, action));
  };
}

export type AssignmentsAction = Pick<
  AssignmentsActionImpl,
  keyof AssignmentsActionImpl
>;
