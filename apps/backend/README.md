# VedaAI Backend

AI assessment generator backend. Bun + Express (TypeScript), MongoDB, Redis, BullMQ, Socket.IO, Vercel AI SDK.

## Architecture

```
HTTP (Express)             Realtime (Socket.IO + Redis adapter)
        │                                 ▲
        ▼                                 │
   Assignment            ┌─────► realtime.emitter ◄─────┐
   service / controller  │                              │
        │                │                              │
        ▼                │                              │
   BullMQ enqueue ──► generation.worker ──► Vercel AI SDK (gpt-5-mini)
                            │                  │
                            │                  ▼
                            │          structured paper
                            ▼                  │
                       MongoDB (Atlas) ◄───────┘
                            │
                            ▼
                      pdf.worker (Puppeteer) ──► Redis cache
```

Single Bun process runs the HTTP server, Socket.IO, and the BullMQ workers. Splitting workers into a separate process is a one-line change later (just don't call `startGenerationWorker` / `startPdfWorker` in the HTTP process).

### Request flow

1. `POST /api/assignments` (multipart with optional source file) → validate with Zod → persist `Assignment` (status `queued`) → enqueue `paper-generation` job → respond immediately with the assignment id.
2. Client opens Socket.IO and emits `assignment:subscribe` with the id to join the room.
3. `generation.worker` runs `generatePaper()`. Vercel AI SDK `generateObject` returns a Zod-validated structured paper — never raw text. Result upserted into `QuestionPaper`. Status updates emitted on the room.
4. Client renders the paper from `GET /api/assignments/:id/paper`.
5. `GET /api/assignments/:id/pdf` returns a cached PDF or enqueues a render job (Puppeteer).

### Schema design choices

- `Assignment` and `QuestionPaper` are split because their lifecycles differ (assignment is mutable form state, paper is the immutable AI output) and queries access them independently.
- Sections and questions are **embedded** in `QuestionPaper` because they are bounded (teacher-set counts) and always read together. Follows the schema-design "data accessed together stored together" principle.
- `schemaVersion` field on every doc to enable safe future migrations (schema-versioning pattern).
- Compound index on `{ teacherId: 1, createdAt: -1 }` for the dashboard list view; unique index on `QuestionPaper.assignmentId` since regeneration replaces in place.

### MongoDB connection sizing

OLTP traditional-server profile (per the mongodb-connection skill):
`maxPoolSize: 50`, `minPoolSize: 5`, `maxIdleTimeMS: 5min`, `serverSelectionTimeoutMS: 5s`. Suitable for the Atlas free tier with a single backend instance. If you scale horizontally on Render, multiply pool size by instance count to confirm you stay below the cluster's connection ceiling.

### Redis connection layout

Per the BullMQ specialist guidance, separate ioredis clients are kept by purpose so blocking BullMQ clients never starve cache or Socket.IO traffic:

- `cache` — generic GET/SET (PDF buffers)
- `bullmq` — internal BullMQ; we hand BullMQ a plain options object built from `REDIS_URL` because BullMQ ships its own bundled ioredis
- `pubsub-pub` / `pubsub-sub` — Socket.IO Redis adapter

## Setup

### Prerequisites

- Bun ≥ 1.3
- Redis (local Docker via `docker compose up -d`, or Upstash/Redis Cloud)
- MongoDB Atlas cluster (the `MONGODB_URI` already pre-filled in `.env` is for the dev cluster)
- OpenAI API key

### Install

```bash
bun install
cp .env.example .env  # edit values
docker compose up -d  # starts Redis on :6379
bun run dev           # starts server in --hot mode
```

The server listens on `PORT` (default `8080`). Health: `http://localhost:8080/health`.

### Environment

| Var | Default | Notes |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `NODE_ENV` | `development` | Pretty logs in dev, JSON in prod |
| `LOG_LEVEL` | `info` | pino level |
| `CORS_ORIGIN` | `*` | Frontend origin |
| `MONGODB_URI` | — | Atlas connection string |
| `REDIS_URL` | — | `redis://...` or `rediss://...` for TLS |
| `OPENAI_API_KEY` | — | Optional at boot, required when generation runs |
| `OPENAI_MODEL` | `gpt-5-mini` | Any Vercel AI SDK OpenAI model |
| `UPLOAD_DIR` | `./uploads` | Currently in-memory; placeholder for S3 later |
| `MAX_UPLOAD_BYTES` | `10485760` | Multer limit |
| `PDF_CACHE_TTL` | `3600` | Seconds in Redis |

## API

All endpoints under `/api/assignments`.

### `POST /api/assignments`

Create an assignment and enqueue generation. `multipart/form-data` so an optional `source` file (PDF / text) can be uploaded alongside the JSON-encoded fields.

Body fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | Max 200 |
| `subject` | string | no | |
| `gradeLevel` | string | no | |
| `dueDate` | ISO date | yes | Must be in the future |
| `additionalInstructions` | string | no | Max 2000 |
| `questionConfigs` | JSON string | yes | Array of `{ type, count, marksPerQuestion, difficultyMix? }` |
| `source` | file | no | `application/pdf` or `text/plain`, max 10 MB |

`questionConfigs[i].type` ∈ `mcq | short_answer | long_answer | true_false | fill_blank`.
`difficultyMix` is `{ easy, moderate, hard }` summing to 100.

Returns `201 { assignment }`.

### `GET /api/assignments`
List recent assignments. `?limit=N`.

### `GET /api/assignments/:id`
Fetch a single assignment (status drives UI gating).

### `GET /api/assignments/:id/paper`
Fetch the generated structured paper. 404 until generation completes.

### `POST /api/assignments/:id/regenerate`
Re-run generation. Returns `202`.

### `GET /api/assignments/:id/pdf`
Returns `application/pdf` if cached, otherwise `202 { status: 'rendering', retryAfterMs }` and enqueues a Puppeteer render. Optional query params `studentName`, `rollNumber`, `section` are stamped onto the paper header.

## Realtime events

Connect with Socket.IO and emit `assignment:subscribe` with the assignment id.

Server → client:

| Event | Payload |
| --- | --- |
| `assignment:status` | `{ assignmentId, status }` (`queued`/`generating`/`completed`/`failed`) |
| `assignment:progress` | `{ assignmentId, stage, pct? }` |
| `assignment:completed` | `{ assignmentId, paperId }` |
| `assignment:failed` | `{ assignmentId, reason }` |

Same payload contracts in `src/realtime/events.ts` — share with the frontend.

## Project layout

```
backend/
├── index.ts                        # bun entrypoint
├── docker-compose.yml              # local redis
├── src/
│   ├── app.ts                      # express factory
│   ├── server.ts                   # boot + graceful shutdown
│   ├── config/                     # env, mongo, redis (singletons)
│   ├── models/                     # mongoose schemas
│   ├── modules/
│   │   ├── assignments/            # routes, controller, service, validators
│   │   └── uploads/                # multer + pdf/text extraction
│   ├── ai/                         # prompt + zod schema + generator
│   ├── queues/                     # bullmq queues, workers, connection
│   ├── realtime/                   # socket.io server + emitter
│   ├── pdf/                        # puppeteer renderer + html template
│   ├── middleware/                 # error handler, request id, async wrapper
│   └── utils/                      # logger, errors
```

## Scripts

```bash
bun run dev        # bun --hot index.ts
bun run start      # bun index.ts (prod)
bun run typecheck  # tsc --noEmit
```

## Deployment notes (Render)

- Set all env vars above in the Render dashboard.
- Use Upstash or Redis Cloud for `REDIS_URL` (`rediss://` for TLS — already supported in `connection.ts`).
- Render free disk is ephemeral — uploads are already in-memory, PDFs cached in Redis, no local writes required.
- Add the install command `bun install` and start command `bun run start`.
- Puppeteer downloads Chromium during install. If install times out, prebuild the image or set `PUPPETEER_SKIP_DOWNLOAD=true` and install Chromium via the platform.

## What's still TODO

- Auth (better-auth integration, drop the `teacherId` placeholder)
- S3 for source uploads (currently in-memory + parsed-text-only)
- Frontend (Next.js + Zustand + Socket.IO client)
- Splitting workers into a dedicated process if Render free CPU isn't enough
