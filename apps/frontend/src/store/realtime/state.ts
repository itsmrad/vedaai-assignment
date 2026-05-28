import type { AssignmentStatus } from "@/lib/types";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected";

export interface AssignmentLiveState {
  assignmentId: string;
  status: AssignmentStatus;
  stage?: string;
  pct?: number;
  paperId?: string;
  reason?: string;
  updatedAt: number;
}

export interface RealtimeState {
  connection: ConnectionStatus;
  // Live status per assignment. Updated by socket events.
  liveMap: Record<string, AssignmentLiveState>;
  // Internal: tracks which ids the store is subscribed to.
  subscribedIds: Set<string>;
}

export const initialState: RealtimeState = {
  connection: "idle",
  liveMap: {},
  subscribedIds: new Set(),
};
