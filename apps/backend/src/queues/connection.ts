// BullMQ ships its own bundled ioredis, so passing our IORedis instance from
// `~/config/redis` causes type collisions. We give BullMQ a plain options
// object built from REDIS_URL; BullMQ creates and manages its own clients.

import type { ConnectionOptions } from "bullmq";
import { env } from "~/config/env";

function parseRedisUrl(url: string): ConnectionOptions {
  const u = new URL(url);
  const isTls = u.protocol === "rediss:";
  // See ../config/redis.ts for the Bun TLS workaround rationale.
  const isBun = typeof Bun !== "undefined";
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname && u.pathname !== "/" ? Number(u.pathname.slice(1)) : 0,
    tls: isTls
      ? {
          servername: u.hostname,
          ...(isBun ? { rejectUnauthorized: false } : {}),
        }
      : undefined,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  };
}

export const bullConnection = parseRedisUrl(env.REDIS_URL);
