import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { generationQueue } from "~/queues/generation.queue";
import { pdfQueue } from "~/queues/pdf.queue";

export function setupBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(generationQueue),
      new BullMQAdapter(pdfQueue),
    ],
    serverAdapter,
  });

  return serverAdapter;
}
