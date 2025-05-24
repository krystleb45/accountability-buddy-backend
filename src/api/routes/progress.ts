// src/api/routes/progress.ts
import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authJwt";            // ← fix this import
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getProgressDashboard,
  getProgress,
  updateProgress,
  resetProgress,
} from "../controllers/ProgressController";

const router = Router();

// apply protect to *all* progress routes
router.use(protect);

/**
 * GET  /api/progress/dashboard
 */
router.get("/dashboard", getProgressDashboard);

/**
 * GET  /api/progress
 */
router.get("/", getProgress);

/**
 * PUT  /api/progress/update
 */
router.put(
  "/update",
  [
    check("goalId", "Goal ID is required").notEmpty(),
    check("progress", "Progress must be a number").isNumeric(),
    handleValidationErrors,
  ],
  updateProgress
);

/**
 * DELETE /api/progress/reset
 */
router.delete("/reset", resetProgress);

export default router;
