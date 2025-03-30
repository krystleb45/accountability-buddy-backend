import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import * as ProgressController from "../controllers/ProgressController"; // Corrected controller import path
import { logger } from "../../utils/winstonLogger";import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();



/**
 * @route   GET /progress
 * @desc    Get user progress
 * @access  Private
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
      next(error); // Pass error to global error handler
    }
  },
);

/**
 * @route   PUT /progress/update
 * @desc    Update user progress
 * @access  Private
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
      next(error); // Pass error to global error handler
    }
  },
);

/**
 * @route   DELETE /progress/reset
 * @desc    Reset user progress
 * @access  Private
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
      next(error); // Pass error to global error handler
    }
  },
);

export default router;
