import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import * as TrackerController from "../controllers/TrackerController"; // Correct controller import path
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger"; // Logging utility

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of tracker routes.
 */
const trackerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per IP per window
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
  res
    .status(500)
    .json({ success: false, message: defaultMessage, error: errorMessage });
};

/**
 * @route   GET /tracker
 * @desc    Get tracking data for the authenticated user
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Call controller and pass full request data
      await TrackerController.getTrackingData(req, res, next);
    } catch (error) {
      handleError(error, res, "Error fetching tracking data");
      next(error); // Ensure errors are passed to middleware
    }
  },
);

/**
 * @route   POST /tracker/add
 * @desc    Add tracking data for the authenticated user
 * @access  Private
 */
router.post(
  "/add",
  authMiddleware,
  trackerRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const trackingData = req.body;
      if (!trackingData || Object.keys(trackingData).length === 0) {
        res
          .status(400)
          .json({ success: false, message: "Tracking data is required." });
        return;
      }

      // Call controller and pass full request data
      await TrackerController.addTrackingData(req, res, next);
    } catch (error) {
      handleError(error, res, "Error adding tracking data");
      next(error);
    }
  },
);

/**
 * @route   DELETE /tracker/delete/:id
 * @desc    Delete tracking data by ID for the authenticated user
 * @access  Private
 */
router.delete(
  "/delete/:id",
  authMiddleware,
  async (
    req: Request<{ id: string }>, // Explicit ID param type
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ success: false, message: "Data ID is required." });
        return;
      }

      // Call controller and pass full request data
      await TrackerController.deleteTrackingData(req, res, next);
    } catch (error) {
      handleError(error, res, "Error deleting tracking data");
      next(error);
    }
  },
);

export default router;
