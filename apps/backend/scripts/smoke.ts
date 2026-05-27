// End-to-end smoke test.
// Runs against a live backend (server must be running), exercises:
//  - HTTP create -> 201
//  - Socket.IO subscribe + status/progress/completed events
//  - GET /paper after completion
//  - Optional GET /pdf
//
// Usage: bun scripts/smoke.ts
//
// Env: BACKEND_URL (default http://localhost:8080)

import { io, type Socket } from "socket.io-client";

const BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const body = new FormData();
body.append("title", "Smoke Test: Photosynthesis");
body.append("subject", "Biology");
body.append("gradeLevel", "Class 10");
body.append("dueDate", dueDate);
body.append("additionalInstructions", "Keep questions student-friendly.");
body.append(
  "questionConfigs",
  JSON.stringify([
    {
      type: "mcq",
      count: 3,
      marksPerQuestion: 2,
      difficultyMix: { easy: 50, moderate: 50, hard: 0 },
    },
    {
      type: "short_answer",
      count: 2,
      marksPerQuestion: 5,
      difficultyMix: { easy: 0, moderate: 100, hard: 0 },
    },
  ]),
);

async function main() {
  console.log(`> POST ${BASE}/api/assignments`);
  const res = await fetch(`${BASE}/api/assignments`, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create failed: ${res.status} ${text}`);
  }
  const { assignment } = (await res.json()) as { assignment: { _id: string; status: string } };
  const id = assignment._id;
  console.log(`  ok -> id=${id} status=${assignment.status}`);

  console.log(`> connect socket.io ${BASE}`);
  const socket: Socket = io(BASE, { transports: ["websocket"] });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("socket connect timeout")), 5_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("connect_error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
  console.log(`  ok socket=${socket.id}`);

  socket.emit("assignment:subscribe", id);

  socket.on("assignment:status", (p) => console.log(`  ◄ status   `, p));
  socket.on("assignment:progress", (p) => console.log(`  ◄ progress `, p));
  socket.on("assignment:failed", (p) => console.log(`  ◄ failed   `, p));

  // Wait for completion (90s budget, AI is slow first call)
  const paperId: string = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("generation timeout")), 90_000);
    socket.once("assignment:completed", (p: { paperId: string }) => {
      clearTimeout(timer);
      resolve(p.paperId);
    });
    socket.once("assignment:failed", (p: { reason: string }) => {
      clearTimeout(timer);
      reject(new Error(`generation failed: ${p.reason}`));
    });
  });
  console.log(`  ✓ generation completed paperId=${paperId}`);

  console.log(`> GET ${BASE}/api/assignments/${id}/paper`);
  const paperRes = await fetch(`${BASE}/api/assignments/${id}/paper`);
  if (!paperRes.ok) throw new Error(`paper fetch failed: ${paperRes.status}`);
  const { paper } = (await paperRes.json()) as { paper: { sections: { questions: unknown[] }[] } };
  const totalQs = paper.sections.reduce((n, s) => n + s.questions.length, 0);
  console.log(`  ✓ paper has ${paper.sections.length} sections / ${totalQs} questions`);

  socket.disconnect();
  console.log(`\nALL CHECKS PASSED ✓`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nSMOKE FAILED:", err.message ?? err);
  process.exit(1);
});
