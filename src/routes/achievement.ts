import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware";
import * as AchievementController from "../controllers/AchievementController";

// Explicitly define the router type
const router: Router = express.Router();

// Configure rate limiter for request throttling
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Middleware for validating required fields in the request body
const validateBody =
  (fields: string[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const missingFields = fields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
        return;
      }

      next();
    };

/**
 * @desc Get all achievements for a user
 * @route GET /api/achievements
 * @access Private
 */
router.get(
  "/",
  authMiddleware, // Use authMiddleware to validate authentication
  async (
    req: Request, // Start with generic Request
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Explicitly assert the type as AuthenticatedRequest
      const authReq = req as Request;

      const userId = authReq.user?.id; // Safe access after type assertion

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
        return;
      }

      // Fetch achievements
      const achievements = await AchievementController.getAllAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error); // Delegate errors to middleware
    }
  },
);

/**
 * @desc Add a new achievement
 * @route POST /api/achievements/add
 * @access Private
 */
router.post(
  "/add",
  authMiddleware,
  rateLimiter,
  validateBody(["title", "description"]),
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authReq = req as Request; // Explicit type assertion
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
        return;
      }

      const achievementData = req.body;

      const newAchievement = await AchievementController.addAchievement(
        userId,
        achievementData,
      );

      res.status(201).json({
        success: true,
        message: "Achievement added successfully.",
        data: newAchievement,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @desc Delete an achievement by ID
 * @route DELETE /api/achievements/delete
 * @access Private
 */
router.delete(
  "/delete",
  authMiddleware,
  validateBody(["achievementId"]),
  async (
    req: Request, // Keep it as Express default Request type
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Explicitly cast req to AuthenticatedRequest
      //const authReq = req as AuthenticatedRequest;

      //const userId = authReq.user?.id; // Safe access after type assertion

      // Extract required fields
      const { achievementId } = req.body;

      // Perform deletion
      const result = await AchievementController.deleteAchievement(achievementId);

      if (!result) {
        res.status(404).json({
          success: false,
          message: "Achievement not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Achievement deleted successfully.",
      });
    } catch (error) {
      next(error); // Pass error to middleware for handling
    }
  },
);



// Export the router
export default router;
