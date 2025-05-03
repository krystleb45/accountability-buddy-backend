// src/api/routes/activity.ts
import { Router } from "express";
import { check, param } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import validationMiddleware from "../middleware/validationMiddleware";
import {
  getUserActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  logActivity,
  joinActivity,
  leaveActivity,
} from "../controllers/ActivityController";

const router = Router();

// Throttle mutating endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

/**
 * GET /api/activity
 * List user’s activities (paginated via ?page & ?limit)
 */
router.get(
  "/",
  protect,
  getUserActivities
);

/**
 * GET /api/activity/:activityId
 * Fetch a single activity
 */
router.get(
  "/:activityId",
  protect,
  validationMiddleware([
    param("activityId", "Invalid activity ID").isMongoId(),
  ]),
  getActivityById
);

/**
 * POST /api/activity
 * Create a new activity
 */
router.post(
  "/",
  protect,
  limiter,
  validationMiddleware([
    check("title", "Title is required").notEmpty(),
    check("description").optional().isString(),
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
  limiter,
  validationMiddleware([
    param("activityId", "Invalid activity ID").isMongoId(),
    check("title").optional().isString(),
    check("description").optional().isString(),
  ]),
  updateActivity
);

/**
 * DELETE /api/activity/:activityId
 * Soft-delete an activity
 */
router.delete(
  "/:activityId",
  protect,
  validationMiddleware([
    param("activityId", "Invalid activity ID").isMongoId(),
  ]),
  deleteActivity
);

/**
 * POST /api/activity/:activityId/join
 * Join an activity
 */
router.post(
  "/:activityId/join",
  protect,
  validationMiddleware([
    param("activityId", "Invalid activity ID").isMongoId(),
  ]),
  joinActivity
);

/**
 * POST /api/activity/:activityId/leave
 * Leave an activity
 */
router.post(
  "/:activityId/leave",
  protect,
  validationMiddleware([
    param("activityId", "Invalid activity ID").isMongoId(),
  ]),
  leaveActivity
);

/**
 * POST /api/activity/log
 * Legacy logging endpoint
 */
router.post(
  "/log",
  protect,
  limiter,
  validationMiddleware([
    check("title", "Activity type is required").notEmpty(),
    check("description").optional().isString(),
    check("metadata").optional().isObject(),
  ]),
  logActivity
);

export default router;
