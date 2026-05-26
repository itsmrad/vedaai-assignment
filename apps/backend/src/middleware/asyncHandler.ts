import type { NextFunction, Request, RequestHandler, Response } from "express";

// Removes the need to try/catch in every controller; errors land in errorHandler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
