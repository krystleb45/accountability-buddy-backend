import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { protect } from "../middleware/authMiddleware";
import * as TrackerController from "../controllers/TrackerController";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of tracker routes.
 */
const trackerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
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
 * @swagger
 * tags:
 *   name: Tracker
 *   description: Endpoints for tracking user behavior or progress
 */

/**
 * @swagger
 * /tracker:
 *   get:
 *     summary: Get tracking data for the authenticated user
 *     tags: [Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tracking data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await TrackerController.getTrackingData(req, res, next);
    } catch (error) {
      handleError(error, res, "Error fetching tracking data");
      next(error);
    }
  },
);

/**
 * @swagger
 * /tracker/add:
 *   post:
 *     summary: Add tracking data for the authenticated user
 *     tags: [Tracker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               activityType: "goal"
 *               description: "Completed 3 goals today"
 *     responses:
 *       201:
 *         description: Tracking data added successfully
 *       400:
 *         description: Bad request - missing or invalid tracking data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/add",
  protect,
  trackerRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trackingData = req.body;
      if (!trackingData || Object.keys(trackingData).length === 0) {
        res
          .status(400)
          .json({ success: false, message: "Tracking data is required." });
        return;
      }

      await TrackerController.addTrackingData(req, res, next);
    } catch (error) {
      handleError(error, res, "Error adding tracking data");
      next(error);
    }
  },
);

/**
 * @swagger
 * /tracker/delete/{id}:
 *   delete:
 *     summary: Delete tracking data by ID
 *     tags: [Tracker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tracking record to delete
 *     responses:
 *       200:
 *         description: Tracking data deleted successfully
 *       400:
 *         description: Missing or invalid ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/delete/:id",
  protect,
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ success: false, message: "Data ID is required." });
        return;
      }

      await TrackerController.deleteTrackingData(req, res, next);
    } catch (error) {
      handleError(error, res, "Error deleting tracking data");
      next(error);
    }
  },
);

export default router;
