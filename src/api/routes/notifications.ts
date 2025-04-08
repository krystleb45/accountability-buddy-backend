import type { Router } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware"; // Corrected import
import * as NotificationController from "../controllers/NotificationController";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * Rate limiter to prevent spam requests for sending notifications.
 */
const notificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many notifications sent from this IP, please try again later.",
  },
});

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Send a notification
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
 *               - receiverId
 *               - message
 *               - type
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: MongoDB ObjectId of the receiver
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [friend_request, message, group_invite, blog_activity, goal_milestone]
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  protect,
  notificationLimiter,
  [
    check("receiverId", "Receiver ID is required").notEmpty(),
    check("message", "Notification message is required").notEmpty(),
    check("type", "Notification type is required").isIn([
      "friend_request",
      "message",
      "group_invite",
      "blog_activity",
      "goal_milestone",
    ]),
  ],
  handleValidationErrors,
  NotificationController.sendNotification
);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/", protect, NotificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/read:
 *   patch:
 *     summary: Mark notifications as read
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
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/read",
  protect,
  [check("notificationIds", "Notification IDs array is required").isArray()],
  handleValidationErrors,
  NotificationController.markNotificationsAsRead
);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the notification to delete
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.delete("/:notificationId", protect, NotificationController.deleteNotification);

export default router;
