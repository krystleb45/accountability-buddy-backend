// src/api/controllers/NotificationController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import NotificationService from "../services/NotificationService";

interface SendPayload {
  receiverId: string;
  message:    string;
  type?:      string;
  link?:      string;
}

interface ReadPayload {
  notificationIds: string[];
}

export const sendNotification = catchAsync(
  async (req: Request<{}, {}, SendPayload>, res: Response, _next: NextFunction) => {
    const { receiverId, message, type = "info", link } = req.body;
    const senderId = req.user!.id;

    if (!receiverId || !message.trim()) {
      sendResponse(res, 400, false, "receiverId and non‐empty message are required");
      return;
    }

    // CALL THE PUBLIC METHOD, NOT THE PRIVATE ONE:
    await NotificationService.sendInAppNotification(
      senderId,
      receiverId,
      message.trim(),
      type,
      link
    );

    logger.info(`Notification sent from ${senderId} to ${receiverId}`);
    sendResponse(res, 201, true, "Notification sent successfully");
  }
);

export const getNotifications = catchAsync(
  async (
    req: Request<{}, {}, {}, { page?: string; limit?: string }>,
    res: Response
  ) => {
    const userId = req.user!.id;
    const page   = Math.max(1, parseInt(req.query.page  || "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || "10", 10)));

    const { notifications, total } = await NotificationService.listForUser(userId, { page, limit });

    sendResponse(res, 200, true, "Notifications fetched successfully", {
      notifications,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export const markNotificationsAsRead = catchAsync(
  async (req: Request<{}, {}, ReadPayload>, res: Response) => {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      sendResponse(res, 400, false, "notificationIds array is required");
      return;
    }

    const updatedCount = await NotificationService.markRead(userId, notificationIds);
    sendResponse(res, 200, true, "Notifications marked as read", { updatedCount });
  }
);

export const deleteNotification = catchAsync(
  async (req: Request<{ notificationId: string }>, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    await NotificationService.remove(userId, notificationId);
    logger.info(`Notification ${notificationId} deleted by ${userId}`);
    sendResponse(res, 200, true, "Notification deleted successfully");
  }
);

export default {
  sendNotification,
  getNotifications,
  markNotificationsAsRead,
  deleteNotification,
};
