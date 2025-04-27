import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import validationMiddleware from "../middleware/validationMiddleware";
import express from "express";

import {
  getUserActivities,
  getActivityById,      // NEW
  createActivity,       // NEW
  updateActivity,       // NEW
  deleteActivity,
  logActivity,
  joinActivity,         // NEW
  leaveActivity,        // NEW
} from "../controllers/ActivityController";

const router: Router = express.Router();

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * GET /api/activity
 * List (with optional ?page & ?limit)
 */
router.get("/", protect, getUserActivities);

/**
 * GET /api/activity/:activityId
 * Fetch a single activity
 */
router.get("/:activityId", protect, getActivityById);

/**
 * POST /api/activity
 * Create a new activity
 */
router.post(
  "/",
  protect,
  rateLimiter,
  validationMiddleware([
    check("title").notEmpty().withMessage("Title is required"),
    check("description").optional().isString(),
    // any other fields...
  ]),
  createActivity
);

/**
 * PUT /api/activity/:activityId
 * Update an existing activity
 */
router.put(
  "/:activityId",
  protect,
  rateLimiter,
  validationMiddleware([
    check("title").optional().isString(),
    check("description").optional().isString(),
  ]),
  updateActivity
);

/**
 * DELETE /api/activity/:activityId
 * Soft-delete an activity
 */
router.delete("/:activityId", protect, deleteActivity);

/**
 * POST /api/activity/:activityId/join
 */
router.post("/:activityId/join", protect, joinActivity);

/**
 * POST /api/activity/:activityId/leave
 */
router.post("/:activityId/leave", protect, leaveActivity);

/**
 * (Optional) Legacy log endpoint—can redirect to createActivity or kept for audit
 */
router.post(
  "/log",
  [
    protect,
    rateLimiter,
    validationMiddleware([
      check("type").notEmpty().withMessage("Activity type is required."),
      check("description").optional().isString(),
      check("metadata").optional().isObject(),
    ]),
  ],
  logActivity
);

export default router;
