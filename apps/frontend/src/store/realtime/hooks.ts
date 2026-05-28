"use client";

import { useEffect } from "react";
import { useRealtimeStore } from "@/store/realtime";

// Subscribe to live updates for a single assignment for the lifetime of the
// component. Cleans up on unmount.
export function useAssignmentLive(assignmentId: string | undefined) {
  const subscribe = useRealtimeStore((s) => s.subscribe);
  const unsubscribe = useRealtimeStore((s) => s.unsubscribe);
  const live = useRealtimeStore((s) =>
    assignmentId ? s.liveMap[assignmentId] : undefined,
  );

  useEffect(() => {
    if (!assignmentId) return;
    subscribe(assignmentId);
    return () => unsubscribe(assignmentId);
  }, [assignmentId, subscribe, unsubscribe]);

  return live;
}
