import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { env } from "~/config/env";
import { ExternalServiceError } from "~/utils/errors";
import { createChild } from "~/utils/logger";
import type { AssignmentDoc } from "~/models";
import {
  QuestionPaperAISchema,
  normalisePaper,
  type NormalisedPaper,
} from "~/ai/schema";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "~/ai/prompt";

const log = createChild("ai");

export interface GenerateResult {
  paper: NormalisedPaper;
  model: string;
  promptVersion: string;
}

// Vercel AI SDK structured-output. Never returns free text -- if the model
// cannot fit the schema, the SDK throws and BullMQ handles retries.
export async function generatePaper(assignment: AssignmentDoc): Promise<GenerateResult> {
  if (!env.OPENAI_API_KEY) {
    throw new ExternalServiceError("openai", "OPENAI_API_KEY is not configured");
  }
  const userPrompt = buildUserPrompt(assignment);

  log.debug({ assignmentId: assignment._id, model: env.OPENAI_MODEL }, "ai generate start");

  try {
    const { object } = await generateObject({
      model: openai(env.OPENAI_MODEL),
      schema: QuestionPaperAISchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      // Lower temp for stable structure, higher would risk drift
      temperature: 0.4,
    });

    return {
      paper: normalisePaper(object),
      model: env.OPENAI_MODEL,
      promptVersion: PROMPT_VERSION,
    };
  } catch (err) {
    log.error({ err, assignmentId: assignment._id }, "ai generate failed");
    throw new ExternalServiceError("openai", err instanceof Error ? err.message : err);
  }
}
