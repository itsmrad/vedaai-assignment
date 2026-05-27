import type { Server as HttpServer } from "node:http";
import { Server as IOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "~/config/env";
import { getRedis } from "~/config/redis";
import { createChild } from "~/utils/logger";
import { roomFor, type ClientEvents, type ServerEvents } from "~/realtime/events";

const log = createChild("io");

let io: IOServer<ClientEvents, ServerEvents> | null = null;

export async function initIO(httpServer: HttpServer): Promise<IOServer<ClientEvents, ServerEvents>> {
  if (io) return io;

  io = new IOServer<ClientEvents, ServerEvents>(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Redis adapter so multiple backend instances can broadcast to all clients.
  // Worker also publishes via this same adapter when emitting from outside the http process.
  const pub = getRedis("pubsub-pub");
  const sub = getRedis("pubsub-sub");
  io.adapter(createAdapter(pub, sub));

  io.on("connection", (socket) => {
    log.debug({ id: socket.id }, "socket connected");

    socket.on("assignment:subscribe", (assignmentId) => {
      if (!isValidId(assignmentId)) return;
      socket.join(roomFor(assignmentId));
    });

    socket.on("assignment:unsubscribe", (assignmentId) => {
      if (!isValidId(assignmentId)) return;
      socket.leave(roomFor(assignmentId));
    });

    socket.on("disconnect", (reason) => {
      log.debug({ id: socket.id, reason }, "socket disconnected");
    });
  });

  return io;
}

export function getIO(): IOServer<ClientEvents, ServerEvents> {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

// Lightweight ObjectId-shape guard, avoids drag in mongoose here
function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}
