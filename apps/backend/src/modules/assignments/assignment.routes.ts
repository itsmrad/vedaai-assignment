import { Router } from "express";
import { uploadSource } from "~/modules/uploads/upload.middleware";
import { assignmentController } from "~/modules/assignments/assignment.controller";
import { asyncHandler } from "~/middleware/asyncHandler";

const router: Router = Router();

router.post("/", uploadSource.single("source"), asyncHandler(assignmentController.create));
router.get("/", asyncHandler(assignmentController.list));
router.get("/:id", asyncHandler(assignmentController.getOne));
router.delete("/:id", asyncHandler(assignmentController.remove));
router.get("/:id/paper", asyncHandler(assignmentController.getPaper));
router.post("/:id/regenerate", asyncHandler(assignmentController.regenerate));
router.get("/:id/pdf", asyncHandler(assignmentController.pdf));

export default router;
