import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";  // Corrected import to use 'protect'
import validationMiddleware from "../middleware/validationMiddleware";
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
router.get("/", protect, getUserActivities);  // Use 'protect' instead of 'authMiddleware'

/**
 * @route   POST /api/activity/log
 * @desc    Log user activity
 * @access  Private
 */
router.post(
  "/log",
  [
    protect,  // Use 'protect' instead of 'authMiddleware'
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
router.delete("/:activityId", protect, deleteActivity);  // Use 'protect' instead of 'authMiddleware'

export default router;
