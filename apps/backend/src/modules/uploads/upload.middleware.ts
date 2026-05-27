import multer from "multer";
import { env } from "~/config/env";
import { ValidationError } from "~/utils/errors";

const ACCEPTED = new Set(["application/pdf", "text/plain"]);

// In-memory upload; we parse the buffer immediately and discard the file
// so ephemeral filesystems (Render free tier) are not an issue.
const storage = multer.memoryStorage();

export const uploadSource = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED.has(file.mimetype)) {
      return cb(new ValidationError(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});
