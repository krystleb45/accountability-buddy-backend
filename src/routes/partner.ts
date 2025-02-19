import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware";
import * as partnerController from "../controllers/partnerController";
import logger from "../utils/winstonLogger"; // Use your logger here
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate Limiter to prevent abuse
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Validation for Partner Notifications
 */
const validatePartnerInput = [
  check("partnerId", "Partner ID is required and must be a valid Mongo ID")
    .notEmpty()
    .isMongoId(),
  check("goal", "Goal title is required").notEmpty(),
  check("milestone", "Milestone title is required").notEmpty(),
];

/**
 * Validation for Adding a Partner
 */
const validateAddPartnerInput = [
  check("partnerId", "Partner ID is required and must be a valid Mongo ID")
    .notEmpty()
    .isMongoId(),
  check("userId", "User ID is required and must be a valid Mongo ID")
    .notEmpty()
    .isMongoId(),
];



/**
 * @route   POST /partner/notify
 * @desc    Notify partner about a goal milestone
 * @access  Private
 */
router.post(
  "/notify",
  authMiddleware,
  rateLimiter,
  validatePartnerInput,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Call the controller function with req, res, and next
      await partnerController.notifyPartner(req, res, next); // Pass 3 arguments directly

      // Success response is already handled in the controller
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      logger.error(`Error notifying partner: ${errorMessage}`);
      next(err); // Forward error to middleware
    }
  },
);


/**
 * @route   POST /partner/add
 * @desc    Add a partner and send a notification
 * @access  Private
 */
router.post(
  "/add",
  authMiddleware,
  rateLimiter,
  validateAddPartnerInput,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Call the controller function with req, res, and next
      await partnerController.addPartnerNotification(req, res, next); // Pass 3 arguments directly
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      logger.error(`Error adding partner: ${errorMessage}`);
      next(err); // Forward error to middleware
    }
  },
);


/**
 * @route   GET /partner/notifications
 * @desc    Get partner notifications
 * @access  Private
 */
router.get(
  "/notifications",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Pass req, res, and next to the controller function
      await partnerController.getPartnerNotifications(req, res, next); // Fixed argument mismatch
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      logger.error(`Error fetching partner notifications: ${errorMessage}`, {
        userId: req.user?.id,
      });
      next(err); // Forward error to middleware
    }
  },
);


export default router;
