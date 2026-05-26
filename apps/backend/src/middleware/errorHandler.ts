import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError, ValidationError } from "~/utils/errors";
import { env } from "~/config/env";
import { createChild } from "~/utils/logger";

const log = createChild("http");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Normalise to AppError
  let normalised: AppError;
  if (err instanceof AppError) {
    normalised = err;
  } else if (err instanceof ZodError) {
    normalised = new ValidationError("Validation failed", err.flatten());
  } else if (err instanceof multer.MulterError) {
    normalised = new ValidationError(err.message, { field: err.field });
  } else if (err instanceof Error) {
    normalised = new AppError(err.message);
  } else {
    normalised = new AppError("Unknown error");
  }

  if (normalised.status >= 500) {
    log.error({ err, path: req.path }, "request error");
  } else {
    log.warn({ err: normalised.message, path: req.path }, "request rejected");
  }

  res.status(normalised.status).json({
    error: {
      code: normalised.code,
      message: normalised.message,
      details: normalised.details,
      ...(env.NODE_ENV === "development" && normalised.status >= 500 && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
