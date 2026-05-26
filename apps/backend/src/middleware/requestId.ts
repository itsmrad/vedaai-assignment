import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare module "express-serve-static-core" {
  interface Request {
    id?: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string | undefined) || randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
}
