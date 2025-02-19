import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import Activity from "../models/Activity";
import authMiddleware from "../middleware/authMiddleware";
import validationMiddleware from "../middleware/validationMiddleware";


const router: Router = express.Router();

// Role-Based Access Control Middleware
const roleBasedAccessControl = (
  allowedRoles: Array<"user" | "admin" | "moderator">,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as Request;

    // Check if user and role exist
    if (!authReq.user || !authReq.user.role) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(authReq.user.role)) {
      res
        .status(403)
        .json({ success: false, message: "Access forbidden for this role" });
      return;
    }

    next();
  };
};

// Rate limiter middleware
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow 10 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// GET /api/activity
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as Request;

      // Ensure user is authenticated
      if (!authReq.user) {
        res.status(401).json({ success: false, msg: "Unauthorized access" });
        return;
      }

      // Fetch activities for the authenticated user
      const activities = await Activity.find({ user: authReq.user.id }).sort({
        createdAt: -1,
      });

      res.status(200).json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/activity/all - Admin Access Only
router.get(
  "/all",
  [authMiddleware, roleBasedAccessControl(["admin"])],
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Fetch all activities
      const activities = await Activity.find().sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/activity/log - Log User Activity
router.post(
  "/log",
  [
    authMiddleware,
    rateLimiter,
    validationMiddleware([
      check("activityType")
        .notEmpty()
        .withMessage("Activity type is required."),
      check("details")
        .optional()
        .isString()
        .withMessage("Details must be a string."),
    ]),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as Request;

      // Ensure user is authenticated
      if (!authReq.user) {
        res.status(401).json({ success: false, msg: "Unauthorized access" });
        return;
      }

      // Extract activity data
      const { activityType, details } = req.body;

      // Create and save new activity
      const newActivity = new Activity({
        user: authReq.user.id,
        activityType,
        details,
        createdAt: new Date(),
      });

      await newActivity.save();

      res.status(201).json({ success: true, data: newActivity });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
