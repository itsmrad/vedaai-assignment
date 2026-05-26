import type { AssignmentDoc } from "~/models";

export const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `You are an expert teacher and exam paper author.
You produce well-structured, balanced question papers for school and college students.

Rules:
- Group questions into clearly labelled sections (A, B, C ...).
- Each section has a title, an instruction line, and its own total marks.
- Questions must be unambiguous, factually correct, and grade-appropriate.
- Match the requested counts, marks, and difficulty mix exactly.
- For MCQs include 4 plausible choices with exactly one correct answer.
- For true/false provide the answer.
- For short/long answers provide a model answer.
- Distribute difficulty within each section per the requested mix.
- Sum of question marks in a section must equal the section totalMarks.
- Sum of section totalMarks must equal the paper totalMarks.
- Number questions sequentially within each section starting at 1.
- Never include meta commentary, markdown, or any text outside the structured output.`;

function summariseConfigs(a: AssignmentDoc): string {
  return a.questionConfigs
    .map((c, i) => {
      const mix = c.difficultyMix
        ? `mix easy:${c.difficultyMix.easy}% moderate:${c.difficultyMix.moderate}% hard:${c.difficultyMix.hard}%`
        : "mix unspecified";
      return `${i + 1}. ${c.count}x ${c.type} @ ${c.marksPerQuestion} marks each (${mix})`;
    })
    .join("\n");
}

export function buildUserPrompt(assignment: AssignmentDoc): string {
  const totalMarks = assignment.questionConfigs.reduce(
    (sum, c) => sum + c.count * c.marksPerQuestion,
    0,
  );

  const parts: string[] = [
    `Title: ${assignment.title}`,
    assignment.subject ? `Subject: ${assignment.subject}` : "",
    assignment.gradeLevel ? `Grade level: ${assignment.gradeLevel}` : "",
    `Total marks (target): ${totalMarks}`,
    "",
    "Question requirements:",
    summariseConfigs(assignment),
  ];

  if (assignment.additionalInstructions) {
    parts.push("", "Additional instructions from teacher:", assignment.additionalInstructions);
  }

  if (assignment.sourceMaterial?.text) {
    parts.push(
      "",
      "Source material to base questions on (use this content only):",
      "---",
      assignment.sourceMaterial.text.slice(0, 30_000), // hard cap on prompt budget
      "---",
    );
  } else {
    parts.push("", "No source material provided -- generate based on the title and subject.");
  }

  // Append teacher feedback for regeneration (if any)
  if (assignment.regenerationFeedback?.length) {
    parts.push(
      "",
      "Teacher feedback on the previous version (address these in the regeneration):",
      ...assignment.regenerationFeedback.map((f) => {
        if (f.questionNumber !== undefined) {
          return `- Section ${f.sectionLabel}, Question ${f.questionNumber}: "${f.comment}"`;
        }
        return `- Section ${f.sectionLabel}: "${f.comment}"`;
      }),
    );
  }

  parts.push(
    "",
    "Group questions into sections (typically one section per question type, labelled A, B, C...).",
    "Return only the structured object that matches the schema.",
  );

  return parts.filter(Boolean).join("\n");
}

export { SYSTEM_PROMPT };
