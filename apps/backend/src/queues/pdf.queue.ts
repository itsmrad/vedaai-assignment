import { Queue } from "bullmq";
import { bullConnection as connection } from "~/queues/connection";
import { JOB, QUEUE, type RenderPdfJobData } from "~/queues/queueNames";
import { createChild } from "~/utils/logger";

const log = createChild("queue:pdf");

type PdfName = typeof JOB.renderPdf;

export const pdfQueue = new Queue<RenderPdfJobData, unknown, PdfName>(QUEUE.pdf, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 1_500 },
    removeOnComplete: { count: 200, age: 60 * 60 * 6 },
    removeOnFail: { count: 200 },
  },
});

export async function enqueuePdf(data: RenderPdfJobData) {
  const job = await pdfQueue.add(JOB.renderPdf, data);
  log.info({ jobId: job.id, ...data }, "queued pdf");
  return job;
}
