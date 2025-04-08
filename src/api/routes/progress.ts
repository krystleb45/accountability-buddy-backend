import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import * as ProgressController from "../controllers/ProgressController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const progress = await ProgressController.getProgress(req, res, next);

      res.status(200).json({ success: true, progress });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error fetching progress for user ${req.user?.id}: ${errorMessage}`,
      );
      next(error);
    }
  },
);

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
 *             required:
 *               - goalId
 *               - progress
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  "/update",
  protect,
  [
    check("goalId").notEmpty().withMessage("Goal ID is required."),
    check("progress")
      .isNumeric()
      .withMessage("Progress must be a numeric value."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const updatedProgress = await ProgressController.updateProgress(
        req,
        res,
        next,
      );

      res.status(200).json({
        success: true,
        message: "Progress updated successfully.",
        updatedProgress,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error updating progress for user ${req.user?.id}: ${errorMessage}`,
      );
      next(error);
    }
  },
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/reset",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const resetResult = await ProgressController.resetProgress(
        req,
        res,
        next,
      );

      res.status(200).json({
        success: true,
        message: "Progress reset successfully.",
        resetResult,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error resetting progress for user ${req.user?.id}: ${errorMessage}`,
      );
      next(error);
    }
  },
);

export default router;
