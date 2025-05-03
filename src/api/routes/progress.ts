// src/api/routes/progress.ts
import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getProgressDashboard,
  getProgress,
  updateProgress,
  resetProgress,
} from "../controllers/ProgressController";

const router = Router();

/**
 * @swagger
 * /api/progress/dashboard:
 *   get:
 *     summary: Get user progress dashboard
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 */
router.get("/dashboard", protect, getProgressDashboard);

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Get user progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress fetched successfully
 */
router.get("/", protect, getProgress);

/**
 * @swagger
 * /api/progress/update:
 *   put:
 *     summary: Update user progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [goalId, progress]
 *             properties:
 *               goalId:
 *                 type: string
 *               progress:
 *                 type: number
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  "/update",
  protect,
  [
    check("goalId", "Goal ID is required").notEmpty(),
    check("progress", "Progress must be a number").isNumeric(),
    handleValidationErrors,
  ],
  updateProgress
);

/**
 * @swagger
 * /api/progress/reset:
 *   delete:
 *     summary: Reset user progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress reset successfully
 */
router.delete("/reset", protect, resetProgress);

export default router;
