import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "~/config/env";
import { requestId } from "~/middleware/requestId";
import { errorHandler, notFoundHandler } from "~/middleware/errorHandler";
import assignmentRoutes from "~/modules/assignments/assignment.routes";
import { setupBullBoard } from "~/queues/bull-board";

export function buildApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestId);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Bull Board UI for monitoring queues in real time
  const bullBoard = setupBullBoard();
  app.use("/admin/queues", bullBoard.getRouter());

  app.use("/api/assignments", assignmentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
