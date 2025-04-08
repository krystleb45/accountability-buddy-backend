import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
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
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * @swagger
 * tags:
 *   name: Activity
 *   description: User activity logging and management
 */

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: Get user activities
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by activity type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of activities retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", protect, getUserActivities);

/**
 * @swagger
 * /api/activity/log:
 *   post:
 *     summary: Log a user activity
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 example: login
 *               description:
 *                 type: string
 *                 example: User logged in from web
 *               metadata:
 *                 type: object
 *                 example: { ip: "192.168.1.1", browser: "Chrome" }
 *     responses:
 *       201:
 *         description: Activity logged successfully
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/log",
  [
    protect,
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
 * @swagger
 * /api/activity/{activityId}:
 *   delete:
 *     summary: Delete a user activity by ID (soft delete)
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the activity to delete
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       400:
 *         description: Invalid activity ID
 *       401:
 *         description: Unauthorized
 */
router.delete("/:activityId", protect, deleteActivity);

export default router;
