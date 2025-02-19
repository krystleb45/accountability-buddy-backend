import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import * as feedbackController from "../controllers/FeedbackController";
import authMiddleware from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate limiter to prevent spam in feedback submissions.
 */
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 feedback submissions per hour
  message: "Too many feedback submissions, please try again later",
});


/**
 * @route   POST /feedback
 * @desc    Submit feedback
 * @access  Private
 */
router.post(
  "/",
  authMiddleware,
  feedbackLimiter,
  [
    check("message", "Feedback message is required")
      .notEmpty()
      .isLength({ max: 1000 }),
    check("type", "Invalid feedback type").isIn([
      "bug",
      "feature-request",
      "other",
    ]),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Await the controller function to handle the async operation
      await feedbackController.submitFeedback(req as any, res, next); // Add 'await'
    } catch (error) {
      // Log and pass error to middleware
      logger.error(`Error submitting feedback: ${(error as Error).message}`, {
        error,
      });
      next(error); // Forward error to middleware
    }
  },
);


/**
 * @route   GET /feedback
 * @desc    Get feedback submitted by the authenticated user
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const feedback = feedbackController.getUserFeedback(req as any, res, next); // Pass 'next'
      res.status(200).json({ success: true, data: feedback });
    } catch (error) {
      logger.error(`Error fetching feedback: ${(error as Error).message}`, { error });
      next(error); // Forward error to middleware
    }
  },
);

/**
 * @route   DELETE /feedback/:feedbackId
 * @desc    Delete feedback by ID
 * @access  Private
 */
router.delete(
  "/:feedbackId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { feedbackId } = req.params;

    // Validate feedback ID format
    if (!feedbackId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({ success: false, msg: "Invalid feedback ID" });
      return; // Early exit without returning a value
    }

    try {
      feedbackController.deleteFeedback(req as any, res, next); // Pass 'next'
      res.status(200).json({ success: true, msg: "Feedback deleted successfully" });
    } catch (error) {
      logger.error(`Error deleting feedback: ${(error as Error).message}`, { error });
      next(error); // Forward error to middleware
    }
  },
);

export default router;
