// src/controllers/partnerController.ts
import type { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import { logger } from "../../utils/winstonLogger";

/**
 * @desc    Notify a partner about a goal milestone
 * @route   POST /api/partner/notify
 * @access  Private
 */
export const notifyPartner = catchAsync(
  async (
    req: Request<{}, {}, { partnerId: string; goal: string; milestone: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { partnerId, goal, milestone } = sanitize(req.body);
    const senderId = req.user?.id;

    if (!senderId || !partnerId || !goal || !milestone) {
      sendResponse(res, 400, false, "partnerId, goal and milestone are required.");
      return;
    }

    try {
      const notification = await Notification.create({
        sender: senderId,
        user: partnerId,
        message: `Your partner (User ${senderId}) progressed on milestone "${milestone}" of goal "${goal}".`,
        type: "partner-notification",
        read: false,
      });

      sendResponse(res, 200, true, "Partner notified successfully.", { notification });
    } catch (err) {
      logger.error("Error in notifyPartner:", { error: err, partnerId, senderId });
      next(err);
    }
  }
);


/**
 * @desc    Add a partner and send a notification
 * @route   POST /api/partner/add
 * @access  Private
 */
export const addPartnerNotification = catchAsync(
  async (
    req: Request<{}, {}, { partnerId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { partnerId } = sanitize(req.body);
    const senderId = req.user?.id;

    if (!senderId || !partnerId) {
      sendResponse(res, 400, false, "partnerId is required.");
      return;
    }

    try {
      // Here you could insert logic to actually link partner <-> user
      const notification = await Notification.create({
        sender: senderId,
        user: partnerId,
        message: `User ${senderId} has added you as a partner.`,
        type: "partner-notification",
        read: false,
      });

      sendResponse(res, 200, true, "Partner added and notified successfully.", { notification });
    } catch (err) {
      logger.error("Error in addPartnerNotification:", { error: err, partnerId, senderId });
      next(err);
    }
  }
);


/**
 * @desc    Get all partner notifications for the authenticated user
 * @route   GET /api/partner/notifications
 * @access  Private
 */
export const getPartnerNotifications = catchAsync(
  async (
    req: Request<{}, {}, {}, { page?: string; limit?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10", 10)));

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    try {
      const [notifications, total] = await Promise.all([
        Notification.find({ user: userId, type: "partner-notification" })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Notification.countDocuments({ user: userId, type: "partner-notification" }),
      ]);

      if (notifications.length === 0) {
        sendResponse(res, 404, false, "No partner notifications found.");
        return;
      }

      sendResponse(res, 200, true, "Partner notifications fetched successfully.", {
        notifications,
        pagination: {
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      logger.error("Error in getPartnerNotifications:", { error: err, userId });
      next(err);
    }
  }
);

export default {
  notifyPartner,
  addPartnerNotification,
  getPartnerNotifications,
};
