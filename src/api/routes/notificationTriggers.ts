// src/api/routes/notificationTrigger.ts

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as TriggerController from "../controllers/notificationsTriggersController";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// throttle trigger endpoints to prevent abuse
const triggerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

/**
 * @swagger
 * /api/notifications/daily-streak-reminder:
 *   post:
 *     summary: Trigger a daily streak reminder for a user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reminder sent
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/daily-streak-reminder",
  protect,
  triggerLimiter,
  [check("userId", "User ID is required").notEmpty().isMongoId()],
  handleValidationErrors,
  TriggerController.dailyStreakReminder
);

/**
 * @swagger
 * /api/notifications/level-up:
 *   post:
 *     summary: Trigger a level-up notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - level
 *             properties:
 *               userId:
 *                 type: string
 *               level:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Level-up notification triggered
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/level-up",
  protect,
  triggerLimiter,
  [
    check("userId", "User ID is required").notEmpty().isMongoId(),
    check("level", "Level must be a positive integer").isInt({ min: 1 }),
  ],
  handleValidationErrors,
  TriggerController.levelUpNotification
);

/**
 * @swagger
 * /api/notifications/badge-unlock:
 *   post:
 *     summary: Trigger a badge-unlock notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - badgeName
 *             properties:
 *               userId:
 *                 type: string
 *               badgeName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Badge-unlock notification triggered
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/badge-unlock",
  protect,
  triggerLimiter,
  [
    check("userId", "User ID is required").notEmpty().isMongoId(),
    check("badgeName", "Badge name is required").notEmpty(),
  ],
  handleValidationErrors,
  TriggerController.badgeUnlockNotification
);

/**
 * @swagger
 * /api/notifications/email:
 *   post:
 *     summary: Trigger a custom email notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - text
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email notification triggered
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/email",
  protect,
  triggerLimiter,
  [
    check("email", "Valid email is required").notEmpty().isEmail(),
    check("subject", "Subject is required").notEmpty(),
    check("text", "Text is required").notEmpty(),
  ],
  handleValidationErrors,
  TriggerController.customEmailNotification
);

export default router;
