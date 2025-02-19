import type { Request, Response } from "express";
import Notification from "../models/Notification"; // Adjusted import
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";

// Sanitize input utility
const sanitizeInput = (input: any): any => {
  if (typeof input === "string") {
    return input.replace(/\$|\./g, "");
  }
  if (typeof input === "object" && input !== null) {
    for (const key in input) {
      input[key] = sanitizeInput(input[key]);
    }
  }
  return input;
};

/**
 * @desc Send a notification
 * @route POST /api/notifications
 * @access Private
 */
export const sendNotification = catchAsync(
  async (
    req: Request<{}, {}, { receiverId: string; message: string }>, // Explicit body type
    res: Response,
  ): Promise<void> => {
    const { receiverId, message } = sanitizeInput(req.body);
    const senderId = req.user?.id;

    if (!receiverId) {
      sendResponse(res, 400, false, "Receiver ID is required");
      return;
    }

    if (!message || message.trim() === "") {
      sendResponse(res, 400, false, "Notification content cannot be empty");
      return;
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      sendResponse(res, 404, false, "Receiver not found");
      return;
    }

    const newNotification = await Notification.create({
      sender: senderId,
      receiver: receiverId,
      content: message,
    });

    logger.info(`Notification sent from user ${senderId} to user ${receiverId}`);
    sendResponse(res, 201, true, "Notification sent successfully", {
      notification: newNotification,
    });
  },
);

/**
 * @desc Get notifications for the user
 * @route GET /api/notifications
 * @access Private
 */
export const getNotifications = catchAsync(
  async (
    req: Request<{}, {}, {}, { limit?: string; page?: string }>, // Explicit query parameters
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit || "10", 10);
    const page = parseInt(req.query.page || "1", 10);

    const notifications = await Notification.find({ receiver: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalNotifications = await Notification.countDocuments({ receiver: userId });

    sendResponse(res, 200, true, "Notifications fetched successfully", {
      notifications,
      pagination: {
        totalNotifications,
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
      },
    });
  },
);

/**
 * @desc Mark notifications as read
 * @route PATCH /api/notifications/read
 * @access Private
 */
export const markNotificationsAsRead = catchAsync(
  async (
    req: Request<{}, {}, { notificationIds: string[] }>, // Explicit body type
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { notificationIds } = req.body;

    const result = await Notification.updateMany(
      { receiver: userId, _id: { $in: notificationIds }, isRead: false },
      { isRead: true },
    );

    sendResponse(res, 200, true, "Notifications marked as read", {
      updatedCount: result.modifiedCount,
    });
  },
);

/**
 * @desc Delete a notification
 * @route DELETE /api/notifications/:notificationId
 * @access Private
 */
export const deleteNotification = catchAsync(
  async (
    req: Request<{ notificationId: string }>, // Explicit route parameters
    res: Response,
  ): Promise<void> => {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      sendResponse(res, 404, false, "Notification not found");
      return;
    }

    await notification.deleteOne();
    logger.info(`Notification with ID ${notificationId} deleted`);
    sendResponse(res, 200, true, "Notification deleted successfully");
  },
);
