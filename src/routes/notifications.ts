import type { Router } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware";
import * as NotificationController from "../controllers/NotificationController";
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path

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
 * @route   POST /api/notifications
 * @desc    Send a notification
 * @access  Private
 */
router.post(
  "/",
  authMiddleware,
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
 * @route   GET /api/notifications
 * @desc    Get notifications for the authenticated user
 * @access  Private
 */
router.get("/", authMiddleware, NotificationController.getNotifications);

/**
 * @route   PATCH /api/notifications/read
 * @desc    Mark notifications as read
 * @access  Private
 */
router.patch(
  "/read",
  authMiddleware,
  [check("notificationIds", "Notification IDs array is required").isArray()],
  handleValidationErrors,
  NotificationController.markNotificationsAsRead
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete("/:notificationId", authMiddleware, NotificationController.deleteNotification);

export default router;
