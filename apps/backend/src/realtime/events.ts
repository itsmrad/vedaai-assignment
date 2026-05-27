// Single source of truth for socket event names + payload contracts.
// Both backend emit and frontend consumption import from here (via shared package later if desired).

import type { AssignmentStatus } from "~/models/assignment.model";

export const ROOM_PREFIX = "assignment:";
export const roomFor = (assignmentId: string) => `${ROOM_PREFIX}${assignmentId}`;

// Server -> client
export interface ServerEvents {
  "assignment:status": (p: { assignmentId: string; status: AssignmentStatus }) => void;
  "assignment:progress": (p: { assignmentId: string; stage: string; pct?: number }) => void;
  "assignment:completed": (p: { assignmentId: string; paperId: string }) => void;
  "assignment:failed": (p: { assignmentId: string; reason: string }) => void;
}

// Client -> server
export interface ClientEvents {
  "assignment:subscribe": (assignmentId: string) => void;
  "assignment:unsubscribe": (assignmentId: string) => void;
}
