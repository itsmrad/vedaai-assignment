import { Queue, QueueEvents } from "bullmq";
import { bullConnection as connection } from "~/queues/connection";
import { JOB, QUEUE, type GeneratePaperJobData } from "~/queues/queueNames";
import { createChild } from "~/utils/logger";

const log = createChild("queue:generation");

type GenName = typeof JOB.generatePaper;

export const generationQueue = new Queue<GeneratePaperJobData, unknown, GenName>(QUEUE.generation, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 }, // bullmq-specialist: avoid thundering herd
    removeOnComplete: { count: 500, age: 60 * 60 * 24 }, // keep recent completed for inspection
    removeOnFail: { count: 1_000 },
  },
});

export async function enqueueGeneration(assignmentId: string) {
  const jobId = `gen-${assignmentId}`;
  // Remove any existing job (completed or failed) so regeneration creates a fresh job
  // BullMQ idempotent add won't create a new job if one with same ID exists
  const existingJob = await generationQueue.getJob(jobId);
  if (existingJob) {
    await existingJob.remove();
    log.info({ jobId, assignmentId }, "removed existing job for regeneration");
  }
  const job = await generationQueue.add(
    JOB.generatePaper,
    { assignmentId },
    { jobId },
  );
  log.info({ jobId: job.id, assignmentId }, "queued generation");
  return job;
}

// QueueEvents is used to centrally observe job lifecycle if needed.
// Workers also emit their own events; this is for cross-cutting bookkeeping.
export const generationEvents = new QueueEvents(QUEUE.generation, { connection });
