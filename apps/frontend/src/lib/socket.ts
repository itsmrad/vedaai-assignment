// Singleton Socket.IO client. Components never import this directly --
// the realtime store owns subscription state and exposes typed events.

import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";
import type { ServerEvents } from "@/lib/types";

type ClientEvents = {
  "assignment:subscribe": (id: string) => void;
  "assignment:unsubscribe": (id: string) => void;
};

type AppSocket = Socket<
  { [K in keyof ServerEvents]: (payload: ServerEvents[K]) => void },
  ClientEvents
>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (typeof window === "undefined") {
    throw new Error("getSocket() must only run on the client");
  }
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
