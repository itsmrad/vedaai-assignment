import { Worker } from "bullmq";
import { bullConnection as connection } from "~/queues/connection";
import { getRedis } from "~/config/redis";
import { Assignment, QuestionPaper } from "~/models";
import { JOB, QUEUE, type GeneratePaperJobData } from "~/queues/queueNames";
import { generatePaper } from "~/ai/generator";
import { realtime } from "~/realtime/emitter";
import { createChild } from "~/utils/logger";
import { pdfCacheKey } from "~/queues/pdf.worker";

const log = createChild("worker:generation");
const cache = getRedis("cache");

export function startGenerationWorker() {
  const worker = new Worker<GeneratePaperJobData>(
    QUEUE.generation,
    async (job) => {
      if (job.name !== JOB.generatePaper) {
        log.warn({ name: job.name }, "unknown job name");
        return;
      }

      const { assignmentId } = job.data;
      log.info({ jobId: job.id, assignmentId }, "generation start");

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) throw new Error(`assignment not found: ${assignmentId}`);

      // Mark generating + emit realtime status
      assignment.status = "generating";
      assignment.attempts = (assignment.attempts ?? 0) + 1;
      await assignment.save();
      realtime.status(assignmentId, "generating");
      realtime.progress(assignmentId, "calling-llm");

      // Call AI (Vercel AI SDK structured-output)
      const { paper, model, promptVersion } = await generatePaper(assignment);
      realtime.progress(assignmentId, "persisting");

      // Upsert paper -- regeneration replaces the existing one in place
      const saved = await QuestionPaper.findOneAndUpdate(
        { assignmentId: assignment._id as never },
        {
          assignmentId: assignment._id,
          ...paper,
          model,
          promptVersion,
          generatedAt: new Date(),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).orFail();

      const paperId = saved._id;
      assignment.status = "completed";
      assignment.paperId = paperId as never;
      assignment.failureReason = undefined;
      assignment.regenerationFeedback = undefined;
      await assignment.save();

      // Invalidate cached PDF so regeneration produces fresh render
      await cache.del(pdfCacheKey(String(assignmentId)));

      realtime.completed(assignmentId, String(paperId));
      log.info({ jobId: job.id, assignmentId, paperId }, "generation done");
    },
    {
      connection,
      concurrency: 3, // conservative; bumps as we observe LLM throughput
    },
  );

  worker.on("failed", async (job, err) => {
    log.error({ jobId: job?.id, err }, "generation failed");
    const assignmentId = job?.data?.assignmentId;
    if (!assignmentId) return;
    // Only mark failed when retries are exhausted
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      try {
        await Assignment.findByIdAndUpdate(assignmentId, {
          status: "failed",
          failureReason: err.message?.slice(0, 500),
        });
      } catch (e) {
        log.error({ e }, "failed to mark assignment failed");
      }
      realtime.failed(assignmentId, err.message);
    }
  });

  worker.on("stalled", (jobId) => log.warn({ jobId }, "generation stalled"));

  return worker;
}
