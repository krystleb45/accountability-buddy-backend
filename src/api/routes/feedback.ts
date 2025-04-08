import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import * as feedbackController from "../controllers/FeedbackController";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: User feedback management
 */

// Rate limiter to prevent spam in feedback submissions
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Too many feedback submissions, please try again later",
});

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Submit user feedback
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - type
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *                 enum: [bug, feature-request, other]
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  "/",
  protect,
  feedbackLimiter,
  [
    check("message", "Feedback message is required")
      .notEmpty()
      .isLength({ max: 1000 }),
    check("type", "Invalid feedback type").isIn(["bug", "feature-request", "other"]),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await feedbackController.submitFeedback(req as any, res, next);
    } catch (error) {
      logger.error(`Error submitting feedback: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/feedback:
 *   get:
 *     summary: Get feedback submitted by the authenticated user
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of feedback
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const feedback = feedbackController.getUserFeedback(req as any, res, next);
      res.status(200).json({ success: true, data: feedback });
    } catch (error) {
      logger.error(`Error fetching feedback: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/feedback/{feedbackId}:
 *   delete:
 *     summary: Delete feedback by ID
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     responses:
 *       200:
 *         description: Feedback deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Feedback not found
 */
router.delete(
  "/:feedbackId",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { feedbackId } = req.params;

    if (!feedbackId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({ success: false, msg: "Invalid feedback ID" });
      return;
    }

    try {
      await feedbackController.deleteFeedback(req as any, res, next); // ✅ await it!
      res.status(200).json({ success: true, msg: "Feedback deleted successfully" });
    } catch (error) {
      logger.error(`Error deleting feedback: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);


export default router;
