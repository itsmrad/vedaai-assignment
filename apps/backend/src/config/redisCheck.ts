// Pre-flight Redis check. Fails fast with a friendly message rather than
// spamming raw socket errors when Redis isn't reachable in dev.

import IORedis from "ioredis";
import { env } from "~/config/env";

export async function assertRedisReachable(): Promise<void> {
  const u = new URL(env.REDIS_URL);
  const isTls = u.protocol === "rediss:";
  const isBun = typeof Bun !== "undefined";
  const probe = new IORedis({
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
    connectTimeout: 5_000,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy: () => null,
    lazyConnect: true,
  });

  // Silence the synchronous error event so it doesn't print before we throw
  probe.on("error", () => {});

  try {
    await probe.connect();
    const pong = await probe.ping();
    if (pong !== "PONG") throw new Error(`unexpected ping response: ${pong}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot reach Redis at ${u.hostname}:${u.port || 6379} (${msg}).\n` +
        `Start Redis locally (Memurai, WSL, Docker) or point REDIS_URL at Upstash/Redis Cloud.\n` +
        `Without Redis the queue and realtime adapter cannot run.`,
    );
  } finally {
    probe.disconnect();
  }
}
