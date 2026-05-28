"use client";

import { useEffect } from "react";
import { useRealtimeStore } from "@/store/realtime";

// Mounted once at the dashboard layout. Initialises the singleton socket
// once on the client; safe to mount multiple times because init is idempotent.
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const init = useRealtimeStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return children;
}
