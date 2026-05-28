// Pure reducers for the assignmentsMap shape. Used by dispatch actions in the
// store; isolated here so they're easy to test and reason about.

import type { Assignment, AssignmentStatus } from "@/lib/types";
import type { AssignmentsState } from "@/store/assignments/state";

export type AssignmentAction =
  | { type: "setMany"; items: Assignment[] }
  | { type: "upsert"; item: Assignment }
  | { type: "remove"; id: string }
  | { type: "setStatus"; id: string; status: AssignmentStatus; failureReason?: string };

export function assignmentReducer(
  state: AssignmentsState,
  action: AssignmentAction,
): Pick<AssignmentsState, "assignmentsMap" | "orderedIds"> {
  switch (action.type) {
    case "setMany": {
      const map: Record<string, Assignment> = {};
      const order: string[] = [];
      for (const item of action.items) {
        map[item._id] = item;
        order.push(item._id);
      }
      return { assignmentsMap: map, orderedIds: order };
    }
    case "upsert": {
      const map = { ...state.assignmentsMap, [action.item._id]: action.item };
      const order = state.orderedIds.includes(action.item._id)
        ? state.orderedIds
        : [action.item._id, ...state.orderedIds];
      return { assignmentsMap: map, orderedIds: order };
    }
    case "remove": {
      const { [action.id]: _drop, ...rest } = state.assignmentsMap;
      void _drop;
      return {
        assignmentsMap: rest,
        orderedIds: state.orderedIds.filter((id) => id !== action.id),
      };
    }
    case "setStatus": {
      const existing = state.assignmentsMap[action.id];
      if (!existing) return state;
      return {
        assignmentsMap: {
          ...state.assignmentsMap,
          [action.id]: {
            ...existing,
            status: action.status,
            failureReason: action.failureReason ?? existing.failureReason,
          },
        },
        orderedIds: state.orderedIds,
      };
    }
    default:
      return state;
  }
}
