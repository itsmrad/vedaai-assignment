// Tiny HTML template -- no JSX, no engine. Pure string assembly with escaping.
// The frontend can use this same data-shape for on-screen render so the PDF
// matches the UI.

import type { QuestionPaperDoc } from "~/models/questionPaper.model";

export interface RenderInput {
  paper: QuestionPaperDoc;
  studentInfo?: { name?: string; rollNumber?: string; section?: string };
}

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function renderPaperHtml({ paper, studentInfo }: RenderInput): string {
  const sectionHtml = paper.sections
    .map(
      (sec, secIdx) => `
    <section class="sec${secIdx > 0 ? " sec-gap" : ""}">
      <header class="sec-h">
        <h2>Section ${escape(sec.label)} &mdash; ${escape(sec.title)}</h2>
        <span class="marks">${sec.totalMarks} Marks</span>
      </header>
      <p class="sec-i">${escape(sec.instruction)}</p>
      <ol class="qs">
        ${sec.questions
          .map(
            (q) => `
          <li class="q">
            <div class="q-row">
              <span class="q-n">${q.number}.</span>
              <div class="q-body">
                <span class="q-t">${escape(q.text)}</span>
                <span class="q-meta">
                  <span class="q-m">[${q.marks} ${q.marks === 1 ? "Mark" : "Marks"}]</span>
                </span>
              </div>
            </div>
            ${
              q.choices && q.choices.length
                ? `<ol class="ch" type="A">${q.choices
                    .map((c) => `<li>${escape(c.text)}</li>`)
                    .join("")}</ol>`
                : ""
            }
          </li>`,
          )
          .join("")}
      </ol>
    </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(paper.title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.5; }
  .paper { padding: 10px 0; }

  /* Header */
  .head { border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 20px; text-align: center; }
  .head h1 { font-size: 24px; margin-bottom: 6px; letter-spacing: -0.3px; }
  .meta { display: flex; justify-content: center; gap: 24px; font-size: 13px; color: #444; margin-top: 4px; }

  /* Student info */
  .student { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0 28px; font-size: 13px; }
  .student .f { border-bottom: 1px solid #444; padding-bottom: 6px; }
  .student .f label { color: #555; margin-right: 8px; font-weight: 600; }

  /* Instructions */
  .instr { background: #f9f9f9; border-left: 3px solid #333; padding: 14px 16px; font-size: 13px; margin-bottom: 24px; line-height: 1.6; }
  .instr strong { display: block; margin-bottom: 6px; }
  .instr ol { margin: 0 0 0 20px; padding: 0; }
  .instr ol li { margin: 3px 0; }

  /* Sections */
  .sec { margin-bottom: 10px; page-break-inside: avoid; }
  .sec-gap { margin-top: 36px; }
  .sec-h { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #555; padding-bottom: 6px; margin-bottom: 10px; }
  .sec-h h2 { font-size: 17px; }
  .sec-h .marks { font-size: 12px; color: #555; font-style: italic; }
  .sec-i { font-size: 12px; color: #555; margin: 0 0 14px; font-style: italic; }

  /* Questions */
  .qs { list-style: none; }
  .q { margin-bottom: 20px; page-break-inside: avoid; }
  .q-row { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; line-height: 1.65; }
  .q-n { font-weight: 700; min-width: 28px; flex-shrink: 0; }
  .q-body { flex: 1; }
  .q-t { }
  .q-meta { display: inline; margin-left: 6px; white-space: nowrap; }
  .q-m { font-size: 12px; color: #444; }

  /* Choices */
  .ch { margin: 8px 0 0 36px; padding: 0; font-size: 13px; line-height: 1.5; }
  .ch li { margin: 4px 0; }

  /* Footer */
  .paper-end { border-top: 1px solid #888; padding-top: 10px; margin-top: 30px; text-align: center; font-size: 13px; font-weight: 600; color: #444; }
</style>
</head>
<body>
<div class="paper">
  <div class="head">
    <h1>${escape(paper.title)}</h1>
    <div class="meta">
      ${paper.subject ? `<span>Subject: ${escape(paper.subject)}</span>` : ""}
      ${paper.gradeLevel ? `<span>Grade: ${escape(paper.gradeLevel)}</span>` : ""}
      ${paper.durationMinutes ? `<span>Duration: ${paper.durationMinutes} min</span>` : ""}
      <span>Total Marks: ${paper.totalMarks}</span>
    </div>
  </div>

  <div class="student">
    <div class="f"><label>Name:</label>${escape(studentInfo?.name ?? "")}</div>
    <div class="f"><label>Roll No:</label>${escape(studentInfo?.rollNumber ?? "")}</div>
    <div class="f"><label>Section:</label>${escape(studentInfo?.section ?? "")}</div>
  </div>

  ${
    paper.instructions && paper.instructions.length
      ? `<div class="instr"><strong>General Instructions</strong><ol>${paper.instructions
          .map((i) => `<li>${escape(i)}</li>`)
          .join("")}</ol></div>`
      : ""
  }

  ${sectionHtml}

  <div class="paper-end">— End of Question Paper —</div>
</div>
</body>
</html>`;
}
