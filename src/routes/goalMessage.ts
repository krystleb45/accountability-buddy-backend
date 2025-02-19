import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import * as goalMessageController from "../controllers/GoalMessageController"; // Controller import
import authMiddleware from "../middleware/authMiddleware"; // Auth middleware
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger"; // Logger utility
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate limiter to prevent excessive message sending.
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // Limit to 30 messages per minute per user
  message: "Too many messages sent, please try again later.",
});



/**
 * @route   POST /goal-message/:goalId/send
 * @desc    Send a message related to a specific goal
 * @access  Private
 */
router.post(
  "/:goalId/send",
  authMiddleware,
  messageLimiter,
  [
    check("message", "Message is required").notEmpty(),
    check("message", "Message must not exceed 500 characters").isLength({
      max: 500,
    }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { goalId } = req.params;

    // Validate goalId format
    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({ success: false, msg: "Invalid goal ID" });
      return;
    }

    try {
      await goalMessageController.sendGoalMessage(req as any, res, next); // Added next
      res.status(201).json({ success: true, msg: "Message sent successfully." }); // Response message
    } catch (error) {
      logger.error(`Error sending goal message: ${(error as Error).message}`, {
        error,
        goalId,
        userId: req.user?.id,
      });
      next(error); // Forward the error to middleware
    }
  },
);

/**
 * @route   GET /goal-message/:goalId/messages
 * @desc    Retrieve all messages related to a specific goal
 * @access  Private
 */
router.get(
  "/:goalId/messages",
  authMiddleware,
  async (
    req: Request<{ goalId: string }>, // Explicitly define the 'goalId' parameter
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;

    // Validate goalId format
    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({ success: false, msg: "Invalid goal ID" });
      return; // Ensure early exit
    }

    try {
      const messages = await goalMessageController.getGoalMessages(req as any, res, next); // Pass 'next'
      res.status(200).json({ success: true, data: messages }); // Return fetched messages
    } catch (error) {
      logger.error(`Error fetching goal messages: ${(error as Error).message}`, {
        error,
        goalId,
        userId: req.user?.id,
      });
      next(error); // Forward the error to middleware
    }
  },
);


export default router;
