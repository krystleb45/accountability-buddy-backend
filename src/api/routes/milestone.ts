// src/api/routes/milestone.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { check, param } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as milestoneController from "../controllers/MilestoneController";

const router = Router();

// ─── Rate limiter ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// ─── GET all milestones ──────────────────────────────────────────────────────
router.get(
  "/",
  protect,
  milestoneController.getUserMilestones
);

// ─── POST create a milestone ─────────────────────────────────────────────────
router.post(
  "/",
  protect,
  limiter,
  [
    check("title", "Title is required").notEmpty(),
    check("description", "Description must not exceed 500 characters")
      .optional()
      .isLength({ max: 500 }),
    check("dueDate", "Invalid date format").optional().isISO8601(),
  ],
  handleValidationErrors,
  milestoneController.addMilestone
);

// ─── PUT update a milestone ─────────────────────────────────────────────────
router.put(
  "/:milestoneId",
  protect,
  limiter,
  [
    param("milestoneId", "Invalid milestone ID").isMongoId(),
    // at least one of these should be present:
    check("title").optional().notEmpty(),
    check("description").optional().isLength({ max: 500 }),
    check("dueDate").optional().isISO8601(),
  ],
  handleValidationErrors,
  milestoneController.updateMilestone
);

// ─── DELETE a milestone ─────────────────────────────────────────────────────
router.delete(
  "/:milestoneId",
  protect,
  limiter,
  [
    param("milestoneId", "Invalid milestone ID").isMongoId(),
  ],
  handleValidationErrors,
  milestoneController.deleteMilestone
);

export default router;
