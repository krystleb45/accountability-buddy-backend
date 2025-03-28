import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import authMiddleware from "../api/middleware/authMiddleware";
import validationMiddleware from "../api/middleware/validationMiddleware";
import {
  logActivity,
  getUserActivities,
  deleteActivity,
} from "../controllers/ActivityController";
import express from "express";

const router: Router = express.Router();

// ✅ Rate Limiter to prevent spam logging
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * @route   GET /api/activity
 * @desc    Get user activities (supports filtering & pagination)
 * @access  Private
 */
router.get("/", authMiddleware, getUserActivities);

/**
 * @route   POST /api/activity/log
 * @desc    Log user activity
 * @access  Private
 */
router.post(
  "/log",
  [
    authMiddleware,
    rateLimiter,
    validationMiddleware([
      check("type").notEmpty().withMessage("Activity type is required."),
      check("description").optional().isString().withMessage("Description must be a string."),
      check("metadata").optional().isObject().withMessage("Metadata must be an object."),
    ]),
  ],
  logActivity
);

/**
 * @route   DELETE /api/activity/:activityId
 * @desc    Soft-delete an activity
 * @access  Private
 */
router.delete("/:activityId", authMiddleware, deleteActivity);

export default router;
