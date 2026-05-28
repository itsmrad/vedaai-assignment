// Realtime store actions. Owns the singleton Socket.IO client lifecycle
// and translates server events into store updates.

import { getSocket } from "@/lib/socket";
import type { StoreSetter } from "@/store/types";
import type { RealtimeStore } from "@/store/realtime";
import type { AssignmentLiveState } from "@/store/realtime/state";
import { useAssignmentsStore } from "@/store/assignments";

type Setter = StoreSetter<RealtimeStore>;

export class RealtimeActionImpl {
  readonly #set: Setter;
  readonly #get: () => RealtimeStore;
  #initialized = false;

  constructor(set: Setter, get: () => RealtimeStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  // Wire socket listeners exactly once. Idempotent.
  init = () => {
    if (this.#initialized || typeof window === "undefined") return;
    this.#initialized = true;

    const socket = getSocket();
    this.#set({ connection: socket.connected ? "connected" : "connecting" });

    socket.on("connect", () => {
      this.#set({ connection: "connected" });
      // Re-subscribe to anything the store thinks it's tracking. Handles
      // reconnections without needing components to re-mount.
      for (const id of this.#get().subscribedIds) {
        socket.emit("assignment:subscribe", id);
      }
    });
    socket.on("disconnect", () => this.#set({ connection: "disconnected" }));
    socket.on("connect_error", () => this.#set({ connection: "disconnected" }));

    socket.on("assignment:status", ({ assignmentId, status }) => {
      this.#mergeLive(assignmentId, { status });
      useAssignmentsStore.getState().internal_setStatus(assignmentId, status);
    });

    socket.on("assignment:progress", ({ assignmentId, stage, pct }) => {
      this.#mergeLive(assignmentId, { stage, pct });
    });

    socket.on("assignment:completed", ({ assignmentId, paperId }) => {
      this.#mergeLive(assignmentId, { status: "completed", paperId });
      useAssignmentsStore.getState().internal_setStatus(assignmentId, "completed");
    });

    socket.on("assignment:failed", ({ assignmentId, reason }) => {
      this.#mergeLive(assignmentId, { status: "failed", reason });
      useAssignmentsStore.getState().internal_setStatus(assignmentId, "failed", reason);
    });
  };

  subscribe = (assignmentId: string) => {
    if (typeof window === "undefined") return;
    this.init();
    const subs = new Set(this.#get().subscribedIds);
    if (subs.has(assignmentId)) return;
    subs.add(assignmentId);
    this.#set({ subscribedIds: subs });
    getSocket().emit("assignment:subscribe", assignmentId);
  };

  unsubscribe = (assignmentId: string) => {
    if (typeof window === "undefined") return;
    const subs = new Set(this.#get().subscribedIds);
    if (!subs.has(assignmentId)) return;
    subs.delete(assignmentId);
    this.#set({ subscribedIds: subs });
    getSocket().emit("assignment:unsubscribe", assignmentId);
  };

  // private helper: merge a live-state delta for an assignmentId
  #mergeLive(
    assignmentId: string,
    patch: Partial<Omit<AssignmentLiveState, "assignmentId" | "updatedAt">>,
  ) {
    this.#set((state) => {
      const existing = state.liveMap[assignmentId];
      const next: AssignmentLiveState = {
        assignmentId,
        status: patch.status ?? existing?.status ?? "queued",
        stage: patch.stage ?? existing?.stage,
        pct: patch.pct ?? existing?.pct,
        paperId: patch.paperId ?? existing?.paperId,
        reason: patch.reason ?? existing?.reason,
        updatedAt: Date.now(),
      };
      return { liveMap: { ...state.liveMap, [assignmentId]: next } };
    });
  }
}

export type RealtimeAction = Pick<RealtimeActionImpl, keyof RealtimeActionImpl>;
