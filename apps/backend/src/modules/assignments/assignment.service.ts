import { Assignment, QuestionPaper, type AssignmentDoc } from "~/models";
import { NotFoundError } from "~/utils/errors";
import { enqueueGeneration } from "~/queues/generation.queue";
import { realtime } from "~/realtime/emitter";
import type { CreateAssignmentInput } from "~/modules/assignments/assignment.validators";

interface CreateArgs extends CreateAssignmentInput {
  source?: { originalName: string; mimeType: string; bytes: number; text: string };
}

export const assignmentService = {
  async create(input: CreateArgs): Promise<AssignmentDoc> {
    const doc = await Assignment.create({
      title: input.title,
      subject: input.subject,
      gradeLevel: input.gradeLevel,
      dueDate: input.dueDate,
      additionalInstructions: input.additionalInstructions,
      questionConfigs: input.questionConfigs,
      sourceMaterial: input.source,
      status: "queued",
    });

    const job = await enqueueGeneration(String(doc._id));
    doc.currentJobId = job.id ?? undefined;
    await doc.save();

    // Tell any subscribers the work is enqueued
    realtime.status(String(doc._id), "queued");

    return doc;
  },

  async list({ teacherId, limit = 20 }: { teacherId?: string; limit?: number } = {}) {
    const q = teacherId ? { teacherId } : {};
    return Assignment.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  },

  async getById(id: string): Promise<AssignmentDoc> {
    const doc = await Assignment.findById(id);
    if (!doc) throw new NotFoundError("Assignment");
    return doc;
  },

  async getPaper(assignmentId: string) {
    const paper = await QuestionPaper.findOne({ assignmentId }).lean();
    if (!paper) throw new NotFoundError("Question paper");
    return paper;
  },

  async regenerate(id: string, feedback?: Array<{ sectionLabel: string; comment: string }>): Promise<AssignmentDoc> {
    const doc = await Assignment.findById(id);
    if (!doc) throw new NotFoundError("Assignment");
    doc.status = "queued";
    doc.failureReason = undefined;
    doc.regenerationFeedback = (feedback?.length ? feedback : undefined) as never;
    const job = await enqueueGeneration(String(doc._id));
    doc.currentJobId = job.id ?? undefined;
    await doc.save();
    realtime.status(String(doc._id), "queued");
    return doc;
  },

  async delete(id: string): Promise<void> {
    const doc = await Assignment.findByIdAndDelete(id);
    if (!doc) throw new NotFoundError("Assignment");
    // Best-effort cleanup of related artefacts; failures here shouldn't block the delete.
    await Promise.allSettled([
      QuestionPaper.deleteOne({ assignmentId: doc._id as never }),
      // PDF cache is keyed by assignment id; drop it so a stale render doesn't linger
      (async () => {
        try {
          const cache = (await import("~/config/redis")).getRedis("cache");
          await cache.del(`pdf:${id}`);
        } catch {
          /* swallow -- cache eviction is opportunistic */
        }
      })(),
    ]);
  },
};
