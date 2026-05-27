import { Worker } from "bullmq";
import { bullConnection as connection } from "~/queues/connection";
import { getRedis } from "~/config/redis";
import { QuestionPaper } from "~/models";
import { JOB, QUEUE, type RenderPdfJobData } from "~/queues/queueNames";
import { renderPdf } from "~/pdf/renderer";
import { env } from "~/config/env";
import { createChild } from "~/utils/logger";

const log = createChild("worker:pdf");
const cache = getRedis("cache");

export const pdfCacheKey = (assignmentId: string) => `pdf:${assignmentId}`;

export function startPdfWorker() {
  const worker = new Worker<RenderPdfJobData>(
    QUEUE.pdf,
    async (job) => {
      if (job.name !== JOB.renderPdf) return;
      const { assignmentId, paperId, studentInfo } = job.data;

      log.info({ jobId: job.id, assignmentId }, "render pdf start");

      const paper = await QuestionPaper.findById(paperId);
      if (!paper) throw new Error(`paper not found: ${paperId}`);

      const buf = await renderPdf({ paper, studentInfo });

      // Cache pdf bytes; HTTP route reads from this.
      await cache.set(pdfCacheKey(assignmentId), buf, "EX", env.PDF_CACHE_TTL);

      log.info({ jobId: job.id, assignmentId, bytes: buf.length }, "render pdf done");
      return { bytes: buf.length };
    },
    {
      connection,
      concurrency: 1, // puppeteer is heavy; 1 per process is safe on free tier
    },
  );

  worker.on("failed", (job, err) => log.error({ jobId: job?.id, err }, "pdf failed"));
  worker.on("stalled", (jobId) => log.warn({ jobId }, "pdf stalled"));
  return worker;
}
