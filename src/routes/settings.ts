import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import * as settingsController from "../controllers/SettingsController"; // Correct controller import path
import logger from "../utils/winstonLogger"; // Logger utility
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of settings updates.
 */
const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per IP per window
  message:
    "Too many settings update requests from this IP, please try again later.",
});

/**
 * Middleware to sanitize user input.
 */
const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    next(error);
  }
};



/**
 * @route   GET /settings
 * @desc    Get the current user's settings
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Pass the full req, res, and next objects as arguments
      await settingsController.getUserSettings(req, res, next); // Fixed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      logger.error(`Error fetching settings: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  },
);

/**
 * @route   PUT /settings/update
 * @desc    Update the current user's settings
 * @access  Private
 */
router.put(
  "/update",
  authMiddleware,
  settingsLimiter,
  sanitizeInput,
  [
    check("emailNotifications")
      .optional()
      .isBoolean()
      .withMessage("Invalid value for email notifications."),
    check("smsNotifications")
      .optional()
      .isBoolean()
      .withMessage("Invalid value for SMS notifications."),
    check("theme")
      .optional()
      .isIn(["light", "dark"])
      .withMessage("Invalid theme selection."),
    check("language")
      .optional()
      .isIn(["en", "es", "fr", "de", "zh"])
      .withMessage("Invalid language selection."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Pass the full req, res, and next to match catchAsync expectations
      await settingsController.updateUserSettings(req, res, next); // Fixed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      logger.error(`Error updating settings: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  },
);

/**
 * @route   PUT /settings/password
 * @desc    Update the user's password
 * @access  Private
 */
router.put(
  "/password",
  authMiddleware,
  sanitizeInput,
  [
    check("currentPassword")
      .notEmpty()
      .withMessage("Current password is required."),
    check("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { currentPassword, newPassword } = req.body;

    try {
      settingsController.updateUserPassword(req, currentPassword, newPassword);
      res
        .status(200)
        .json({ success: true, msg: "Password updated successfully" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      logger.error(`Error updating password: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   PUT /settings/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  "/notifications",
  authMiddleware,
  sanitizeInput,
  [
    check("emailNotifications")
      .isBoolean()
      .withMessage("Invalid value for email notifications."),
    check("smsNotifications")
      .isBoolean()
      .withMessage("Invalid value for SMS notifications."),
    check("pushNotifications")
      .isBoolean()
      .withMessage("Invalid value for push notifications."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Pass req, res, and next directly to the controller
      await settingsController.updateNotificationPreferences(req, res, next); // Fixed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      logger.error(`Error updating notification preferences: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  },
);

/**
 * @route   DELETE /settings/account
 * @desc    Deactivate or delete user account
 * @access  Private
 */
router.delete(
  "/account",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Pass req, res, and next to the controller
      await settingsController.deactivateUserAccount(req, res, next); // Fixed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      logger.error(`Error deactivating account: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  },
);

export default router;
