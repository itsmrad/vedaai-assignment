# Manual Testing Guide

Three layers to verify: HTTP API, BullMQ workers, Socket.IO realtime.

## Prerequisites

1. Backend running: `bun run dev`
2. Mongo Atlas reachable (already configured)
3. Redis reachable (Upstash URL in `.env`)
4. `OPENAI_API_KEY` set in `.env` for generation steps

## Option A — Postman

1. Open Postman, click **Import**, select `VedaAI.postman_collection.json`.
2. The collection ships with:
   - `baseUrl` variable (default `http://localhost:8080`)
   - `assignmentId` variable, auto-populated from `01 Create Assignment`
3. Run requests in order (the numeric prefix is the order). Each request has assertions baked in — open the **Test Results** tab after each call.
4. Use **Runner** to execute the whole collection in sequence.

### Testing WebSockets in Postman

Postman supports Socket.IO natively (since v10):

1. Click **New** → **Socket.IO**.
2. URL: `http://localhost:8080`.
3. Click **Connect**.
4. In the **Listen** column add these event names:
   - `assignment:status`
   - `assignment:progress`
   - `assignment:completed`
   - `assignment:failed`
5. In the **Send** column, emit `assignment:subscribe` with the `assignmentId` from your last create request (just paste the raw 24-char hex string).
6. Trigger generation by running `01 Create Assignment` in the HTTP collection. You'll see events stream into the Postman messages panel within 5–30 seconds.

## Option B — VS Code REST Client

1. Install the "REST Client" extension.
2. Open `VedaAI.http`.
3. Click **Send Request** above each block.
4. Copy the `_id` from the create response into the `@assignmentId` variable at the top.

## Option C — One-shot smoke script

The fastest way to verify the entire pipeline end to end:

```bash
bun run smoke
```

Output should look like:

```
> POST http://localhost:8080/api/assignments
  ok -> id=... status=queued
> connect socket.io
  ok socket=...
  ◄ status    { assignmentId: ..., status: 'queued' }
  ◄ status    { assignmentId: ..., status: 'generating' }
  ◄ progress  { stage: 'calling-llm' }
  ◄ progress  { stage: 'persisting' }
  ✓ generation completed paperId=...
> GET .../paper
  ✓ paper has 2 sections / 5 questions

ALL CHECKS PASSED ✓
```

## What each step proves

| Step | Proves |
| --- | --- |
| `00 Health` | Server boots, Express middleware chain works |
| `01 Create Assignment` | Validation, Mongo write, BullMQ enqueue all work |
| `02 Create with PDF` | Multer upload + pdf-parse extraction work |
| `03–05 Validation` | Zod rejects bad input, error middleware shapes the JSON |
| `06 List` | Mongo read + index ordering by `createdAt` desc |
| `07 Get One` | Single-doc fetch, status transitions visible (queued → generating → completed) |
| `08 Get Paper` | AI worker actually ran, structured output persisted |
| `09 Regenerate` | New job enqueued, paper upsert replaces in place |
| `10 PDF` | BullMQ secondary queue + Puppeteer worker render |
| `11 PDF cached` | Redis cache hit returns bytes directly |
| `12–13 Errors` | Error middleware maps NotFoundError → 404, ValidationError → 400 |

## Inspecting queue state directly

In a separate terminal you can connect to your Upstash database with `redis-cli` and snoop:

```bash
# How many jobs are waiting / active / completed
redis-cli -u rediss://default:<pass>@<host>.upstash.io:6379 KEYS 'bull:paper-generation:*'

# Inspect the last completed job
redis-cli -u rediss://... LRANGE bull:paper-generation:completed 0 -1
```

If you don't have `redis-cli`, the Upstash dashboard has a **Data Browser** that shows the same keys.

## Inspecting Mongo state

In MongoDB Compass or the Atlas UI, connect with the same `MONGODB_URI` and check the `vedaai` database. You should see two collections:

- `assignments` — one doc per `POST /api/assignments`
- `questionpapers` — one doc per completed generation, with `assignmentId` linking back

## Verification checklist

Tick these in order:

- [ ] `bun run dev` boots without errors, four `redis connected` lines printed
- [ ] `GET /health` returns 200
- [ ] Create assignment returns 201 with status `queued`
- [ ] Within 30s, `GET /:id` shows status `completed`
- [ ] `GET /:id/paper` returns sections + questions matching your config
- [ ] Section/question counts match what you requested in `questionConfigs`
- [ ] Each question has a `difficulty` tag and `marks`
- [ ] MCQs include `choices` with a correct answer
- [ ] `POST /:id/regenerate` produces a new paper (paper `updatedAt` advances)
- [ ] First `GET /:id/pdf` returns 202; second returns `application/pdf` bytes
- [ ] Validation requests return 400 with `{ error: { code: 'VALIDATION', ... } }`
- [ ] Socket.IO emits the four expected events during generation
