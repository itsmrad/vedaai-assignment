import type { Request, Response } from "express";
import { assignmentService } from "~/modules/assignments/assignment.service";
import {
  CreateAssignmentSchema,
  PdfQuerySchema,
  RegenerateSchema,
} from "~/modules/assignments/assignment.validators";
import { extractText } from "~/modules/uploads/extract";
import { ValidationError } from "~/utils/errors";
import { enqueuePdf } from "~/queues/pdf.queue";
import { pdfCacheKey } from "~/queues/pdf.worker";
import { getRedis } from "~/config/redis";
import { env } from "~/config/env";

const cache = getRedis("cache");

export const assignmentController = {
  async create(req: Request, res: Response) {
    const parsed = CreateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid request body", parsed.error.flatten());
    }

    let source: Awaited<ReturnType<typeof buildSource>> | undefined;
    if (req.file) source = await buildSource(req.file);

    const doc = await assignmentService.create({ ...parsed.data, source });
    res.status(201).json({ assignment: doc });
  },

  async list(req: Request, res: Response) {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 100);
    const items = await assignmentService.list({ limit });
    res.json({ items });
  },

  async getOne(req: Request, res: Response) {
    const id = requireId(req.params.id);
    const doc = await assignmentService.getById(id);
    res.json({ assignment: doc });
  },

  async getPaper(req: Request, res: Response) {
    const id = requireId(req.params.id);
    const paper = await assignmentService.getPaper(id);
    res.json({ paper });
  },

  async regenerate(req: Request, res: Response) {
    const id = requireId(req.params.id);
    const { feedback } = RegenerateSchema.parse(req.body);
    const doc = await assignmentService.regenerate(id, feedback);
    res.status(202).json({ assignment: doc });
  },

  async remove(req: Request, res: Response) {
    const id = requireId(req.params.id);
    await assignmentService.delete(id);
    res.status(204).end();
  },

  async pdf(req: Request, res: Response) {
    const id = requireId(req.params.id);
    const query = PdfQuerySchema.parse(req.query);

    // Try cache first
    const cached = await cache.getBuffer(pdfCacheKey(id));
    if (cached) return sendPdf(res, cached, id);

    // Otherwise enqueue render and tell client to retry shortly.
    // Frontend can poll the same endpoint or rely on socket emit (future).
    const assignment = await assignmentService.getById(id);
    if (!assignment.paperId) {
      return res.status(409).json({ error: "Paper not generated yet" });
    }
    await enqueuePdf({
      assignmentId: id,
      paperId: String(assignment.paperId),
      studentInfo: {
        name: query.studentName,
        rollNumber: query.rollNumber,
        section: query.section,
      },
    });
    res.status(202).json({ status: "rendering", retryAfterMs: 1500 });
  },
};

function requireId(raw: unknown): string {
  if (typeof raw !== "string" || !/^[a-f0-9]{24}$/i.test(raw)) {
    throw new ValidationError("Invalid id");
  }
  return raw;
}

async function buildSource(file: Express.Multer.File) {
  const text = await extractText(file);
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    bytes: file.size,
    text,
  };
}

function sendPdf(res: Response, buf: Buffer, assignmentId: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", `private, max-age=${env.PDF_CACHE_TTL}`);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="paper-${assignmentId}.pdf"`,
  );
  res.send(buf);
}
