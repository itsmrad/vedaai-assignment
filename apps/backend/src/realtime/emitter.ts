// Single emit surface used by HTTP handlers and BullMQ workers alike.
// Workers and HTTP both share the same Socket.IO server in this single-process
// deployment, so direct emit works. If/when workers split out, swap this file
// for a Redis-pub-only emitter without touching call sites.

import { getIO } from "~/realtime/io";
import { roomFor } from "~/realtime/events";
import type { AssignmentStatus } from "~/models/assignment.model";

export const realtime = {
  status(assignmentId: string, status: AssignmentStatus) {
    getIO().to(roomFor(assignmentId)).emit("assignment:status", { assignmentId, status });
  },
  progress(assignmentId: string, stage: string, pct?: number) {
    getIO().to(roomFor(assignmentId)).emit("assignment:progress", { assignmentId, stage, pct });
  },
  completed(assignmentId: string, paperId: string) {
    getIO().to(roomFor(assignmentId)).emit("assignment:completed", { assignmentId, paperId });
  },
  failed(assignmentId: string, reason: string) {
    getIO().to(roomFor(assignmentId)).emit("assignment:failed", { assignmentId, reason });
  },
};
