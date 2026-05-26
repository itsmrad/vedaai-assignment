import pino from "pino";
import { env } from "~/config/env";

// Pretty in dev, JSON in prod
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
});

export const createChild = (mod: string) => logger.child({ mod });
