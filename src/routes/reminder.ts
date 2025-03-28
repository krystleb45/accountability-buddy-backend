import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../api/middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription"; 
import { validateReminder } from "../validators/reminderValidation"; 
import * as customReminderController from "../controllers/customReminderController"; 
import { logger } from "../utils/winstonLogger";
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
 * @desc    Create a custom reminder (Paid Users Only)
 * @access  Private (Paid Subscription Required)
 */
router.post(
  "/create",
  authMiddleware, 
  checkSubscription("paid"), // ✅ Only paid users can create reminders
  reminderLimiter, 
  validateReminder, 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.createReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error creating custom reminder for user ${req.user?.id}: ${errorMessage}`);
      next(error); 
    }
  },
);

/**
 * @route   GET /user
 * @desc    Fetch all reminders for the logged-in user (Trial & Paid Users)
 * @access  Private
 */
router.get(
  "/user",
  authMiddleware,
  checkSubscription("trial"), // ✅ Both trial & paid users can access their reminders
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
 * @desc    Disable a specific reminder by ID (Paid Users Only)
 * @access  Private
 */
router.put(
  "/disable/:reminderId",
  authMiddleware,
  checkSubscription("paid"), // ✅ Only paid users can disable reminders
  async (req: Request<{ reminderId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.disableReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error disabling reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`
      );
      next(error);
    }
  },
);

/**
 * @route   PUT /edit/:reminderId
 * @desc    Edit an existing reminder (Paid Users Only)
 * @access  Private
 */
router.put(
  "/edit/:reminderId",
  authMiddleware,
  checkSubscription("paid"), // ✅ Only paid users can edit reminders
  validateReminder,
  async (req: Request<{ reminderId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.editReminder(req, res, next); 
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error editing reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`
      );
      next(error);
    }
  },
);

/**
 * @route   DELETE /delete/:reminderId
 * @desc    Delete a reminder by ID (Paid Users Only)
 * @access  Private
 */
router.delete(
  "/delete/:reminderId",
  authMiddleware,
  checkSubscription("paid"), // ✅ Only paid users can delete reminders
  async (req: Request<{ reminderId: string }, any, any, ParsedQs, Record<string, any>>, 
    res: Response, 
    next: NextFunction): Promise<void> => {
    try {
      await customReminderController.deleteReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error deleting reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`
      );
      next(error);
    }
  },
);

export default router;
