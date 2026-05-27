import { createServer, type Server as HttpServer } from "node:http";
import { env } from "~/config/env";
import { buildApp } from "~/app";
import { connectMongo, disconnectMongo } from "~/config/mongo";
import { disconnectRedis } from "~/config/redis";
import { assertRedisReachable } from "~/config/redisCheck";
import { initIO } from "~/realtime/io";
import { startGenerationWorker } from "~/queues/generation.worker";
import { startPdfWorker } from "~/queues/pdf.worker";
import { shutdownPdf } from "~/pdf/renderer";
import { logger } from "~/utils/logger";

let httpServer: HttpServer | null = null;
const workers: Array<{ close: () => Promise<void> }> = [];

export async function start() {
  // Fail fast with a friendly message if infra isn't reachable, rather than
  // letting BullMQ/ioredis emit raw socket errors at the runtime level.
  await assertRedisReachable();
  await connectMongo();

  const app = buildApp();
  httpServer = createServer(app);

  await initIO(httpServer);

  // Workers run in the same process for the MVP.
  // Splitting them into a separate process is a one-line change later.
  workers.push(startGenerationWorker());
  workers.push(startPdfWorker());

  await new Promise<void>((resolve) => {
    httpServer!.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, "server listening");
      resolve();
    });
  });
}

export async function stop() {
  logger.info("shutting down");
  // Stop accepting new HTTP traffic
  await new Promise<void>((resolve) => {
    if (!httpServer) return resolve();
    httpServer.close(() => resolve());
  });
  // Drain in-flight workers, then close shared resources
  await Promise.allSettled(workers.map((w) => w.close()));
  await shutdownPdf();
  await disconnectMongo();
  await disconnectRedis();
}

// graceful shutdown signals
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    try {
      await stop();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "shutdown error");
      process.exit(1);
    }
  });
}

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandled rejection");
});
process.on("uncaughtException", (err) => {
  // ioredis surfaces socket errors here when the broker is briefly unreachable.
  // ioredis itself reconnects with backoff, so we log and stay up.
  if (err && (err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
    logger.warn({ err: err.message }, "downstream connection refused (will retry)");
    return;
  }
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});
