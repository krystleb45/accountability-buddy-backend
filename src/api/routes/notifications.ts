// src/api/routes/notifications.ts
import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as NotificationController from "../controllers/NotificationController";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// Limit posts to avoid spam
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
 * POST /api/notifications
 * Send a notification
 */
router.post(
  "/",
  protect,
  notificationLimiter,
  [
    check("receiverId", "Receiver ID is required").notEmpty().isMongoId(),
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
 * GET /api/notifications
 * Get all notifications for current user
 */
router.get(
  "/",
  protect,
  NotificationController.getNotifications
);

/**
 * PATCH /api/notifications/read
 * Mark a batch of notifications as read
 */
router.patch(
  "/read",
  protect,
  [
    check("notificationIds", "notificationIds must be an array of IDs")
      .isArray({ min: 1 })
      .custom((arr: any[]) => arr.every((id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)))
      .withMessage("Each notificationId must be a valid Mongo ID"),
  ],
  handleValidationErrors,
  NotificationController.markNotificationsAsRead
);

/**
 * DELETE /api/notifications/:notificationId
 * Delete a single notification
 */
router.delete(
  "/:notificationId",
  protect,
  [
    check("notificationId", "notificationId must be a valid Mongo ID").isMongoId()
  ],
  handleValidationErrors,
  NotificationController.deleteNotification
);

export default router;
