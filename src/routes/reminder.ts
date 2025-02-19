import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware path
import checkSubscription from "../middleware/checkSubscription"; // Correct middleware path
import { validateReminder } from "../validators/reminderValidation"; // Correct validator path
import * as customReminderController from "../controllers/customReminderController"; // Correct controller path
import logger from "../utils/winstonLogger"; // Logger utility
import type { ParsedQs } from "qs";

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of reminder functionality.
 */
const reminderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per window
  message: {
    success: false,
    message: "Too many reminder requests from this IP, please try again later.",
  },
});

/**
 * @route   POST /create
 * @desc    Create a custom reminder
 * @access  Private (standard and above)
 */
router.post(
  "/create",
  authMiddleware, // Ensure the user is authenticated
  checkSubscription("standard"), // Only standard and premium users can create reminders
  reminderLimiter, // Apply rate limiting
  validateReminder, // Validate reminder input
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.createReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error creating custom reminder for user ${req.user?.id}: ${errorMessage}`);
      next(error); // Forward error to middleware
    }
  },
);

/**
 * @route   GET /user
 * @desc    Fetch all reminders for the logged-in user
 * @access  Private
 */
router.get(
  "/user",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.getUserReminders(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching reminders for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   PUT /disable/:reminderId
 * @desc    Disable a specific reminder by ID
 * @access  Private
 */
router.put(
  "/disable/:reminderId",
  authMiddleware,
  async (
    req: Request<{ reminderId: string }>, // Match reminderId
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await customReminderController.disableReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error disabling reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`,
      );
      next(error);
    }
  },
);

/**
 * @route   PUT /edit/:reminderId
 * @desc    Edit an existing reminder
 * @access  Private
 */
router.put(
  "/edit/:reminderId",
  authMiddleware,
  validateReminder,
  async (
    req: Request<{ reminderId: string }>, // Match reminderId
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await customReminderController.editReminder(req, res, next); // Controller accepts full req
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error editing reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`,
      );
      next(error);
    }
  },
);

/**
 * @route   DELETE /delete/:reminderId
 * @desc    Delete a reminder by ID
 * @access  Private
 */
router.delete(
  "/delete/:reminderId",
  authMiddleware,
  async (
    req: Request<{ reminderId: string }, any, any, ParsedQs, Record<string, any>>, // Match reminderId
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await customReminderController.deleteReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error deleting reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`,
      );
      next(error);
    }
  },
);

export default router;
