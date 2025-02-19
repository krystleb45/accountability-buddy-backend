import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import authMiddleware from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteUserAccount,
} from "../controllers/userController";
import logger from "../utils/winstonLogger";

// Initialize router
const router: Router = express.Router();

// Rate limiter for sensitive routes
const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many requests. Please try again later.",
});

/**
 * Utility for consistent error handling.
 */
const handleError = (
  error: unknown,
  res: Response,
  defaultMessage: string,
): void => {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, message: defaultMessage, error: errorMessage });
};

/**
 * @route   GET /user/profile
 * @desc    Get the user's profile
 * @access  Private
 */
router.get(
  "/profile",
  authMiddleware,
  getUserProfile, // Pass the function reference directly
);


/**
 * @route   PUT /user/profile
 * @desc    Update the user's profile
 * @access  Private
 */
router.put(
  "/profile",
  authMiddleware,
  [
    check("email", "Invalid email").optional().isEmail(),
    check("username", "Username cannot be empty").optional().notEmpty(),
  ],
  updateUserProfile, // Pass function reference directly
);


/**
 * @route   PATCH /user/password
 * @desc    Change the user's password
 * @access  Private
 */
router.patch(
  "/password",
  authMiddleware,
  sensitiveOperationLimiter,
  [
    check("currentPassword", "Current password is required").notEmpty(),
    check("newPassword", "New password must be at least 8 characters").isLength({ min: 8 }),
  ],
  changePassword, // Use controller as middleware
);


/**
 * @route   DELETE /user/account
 * @desc    Delete the user's account
 * @access  Private
 */
router.delete(
  "/account",
  authMiddleware,
  sensitiveOperationLimiter,
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Pass all required arguments
      await deleteUserAccount(req, res, next); // FIX: Properly pass all 3 arguments
    } catch (error) {
      handleError(error, res, "Error deleting user account");
      next(error);
    }
  },
);

export default router;
