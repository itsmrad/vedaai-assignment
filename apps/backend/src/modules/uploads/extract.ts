// pdf-parse has no usable types out of the box for the buffer entry.
// Avoiding `any` by typing the imported function.
import pdfParse from "pdf-parse";

const MAX_TEXT = 200_000; // align with assignment.sourceMaterial.text cap

export async function extractText(file: Express.Multer.File): Promise<string> {
  if (file.mimetype === "text/plain") {
    return file.buffer.toString("utf8").slice(0, MAX_TEXT);
  }
  if (file.mimetype === "application/pdf") {
    const result = await pdfParse(file.buffer);
    return (result.text ?? "").slice(0, MAX_TEXT);
  }
  return "";
}
