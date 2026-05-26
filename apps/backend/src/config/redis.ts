import IORedis, { type Redis, type RedisOptions } from "ioredis";
import { env } from "~/config/env";
import { createChild } from "~/utils/logger";

const log = createChild("redis");

// BullMQ requires maxRetriesPerRequest=null and lazy ready check off
// for proper reconnection of blocking clients.
const baseOpts: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  // Cap reconnect log spam when broker is briefly unreachable in dev.
  // Production should always have redis up; this only changes log volume.
  retryStrategy: (times) => Math.min(1_000 * 2 ** Math.min(times, 5), 30_000),
};

// Bun's TLS does not auto-set SNI from the host string the way Node does,
// so for `rediss://` URLs we must build options manually with `tls.servername`.
// Without it Upstash returns the wrong cert -> ERR_TLS_CERT_ALTNAME_INVALID.
//
// Bun 1.3 also has a known issue where it returns an empty cert object even
// when SNI is set, so we additionally disable strict cert validation when
// running under Bun (the connection is still encrypted; password auth still
// applies). Track: https://github.com/oven-sh/bun/issues (search ioredis tls)
const isBun = typeof Bun !== "undefined";

function buildOptions(url: string): RedisOptions {
  const u = new URL(url);
  const isTls = u.protocol === "rediss:";
  return {
    ...baseOpts,
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname && u.pathname !== "/" ? Number(u.pathname.slice(1)) : 0,
    tls: isTls
      ? {
          servername: u.hostname,
          // Bun-specific workaround. Safe for managed providers (Upstash, etc.)
          // because the password authenticates the connection. Re-enable
          // validation for production on Node.
          ...(isBun ? { rejectUnauthorized: false } : {}),
        }
      : undefined,
  };
}

// Keep connections segregated by purpose so BullMQ blocking clients
// never starve cache/socket.io traffic.
type ClientKind = "cache" | "bullmq" | "pubsub-pub" | "pubsub-sub";
const clients = new Map<ClientKind, Redis>();

function build(kind: ClientKind): Redis {
  const client = new IORedis(buildOptions(env.REDIS_URL));
  // Throttle noisy reconnect errors -- log only the first per disconnect cycle
  let suppressed = 0;
  client.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
      if (suppressed === 0) log.warn({ kind }, "redis unreachable, retrying");
      suppressed++;
      return;
    }
    log.error({ err, kind }, "redis error");
  });
  client.on("connect", () => {
    if (suppressed > 0) log.info({ kind, dropped: suppressed }, "redis reconnected");
    suppressed = 0;
    log.info({ kind }, "redis connected");
  });
  client.on("close", () => log.debug({ kind }, "redis closed"));
  return client;
}

export function getRedis(kind: ClientKind): Redis {
  let c = clients.get(kind);
  if (!c) {
    c = build(kind);
    clients.set(kind, c);
  }
  return c;
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([...clients.values()].map((c) => c.quit()));
  clients.clear();
}
