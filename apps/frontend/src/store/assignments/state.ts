import type { Assignment } from "@/lib/types";

export interface AssignmentsState {
  // Map keyed by id for O(1) updates from realtime events
  assignmentsMap: Record<string, Assignment>;
  orderedIds: string[];

  // List view
  isInitializing: boolean;
  isFetching: boolean;
  fetchError: string | null;
  initialized: boolean;

  // Filter/search UI state
  search: string;

  // Active context menu / row
  contextMenuId: string | null;
}

export const initialState: AssignmentsState = {
  assignmentsMap: {},
  orderedIds: [],
  isInitializing: false,
  isFetching: false,
  fetchError: null,
  initialized: false,
  search: "",
  contextMenuId: null,
};
