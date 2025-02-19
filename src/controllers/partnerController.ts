import type { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification"; // Ensure this matches your model export
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import logger from "../utils/winstonLogger";

/**
 * @desc Notify a partner about a goal milestone
 * @route POST /api/partner/notify
 * @access Private
 */
export const notifyPartner = catchAsync(
  async (
    req: Request<{}, {}, { partnerId: string; goal: string; milestone: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Extract and sanitize inputs
    const { partnerId, goal, milestone } = sanitize(req.body);
    const userId = req.user?.id;

    // Validate required fields
    if (!partnerId || !goal || !milestone || !userId) {
      sendResponse(res, 400, false, "Partner ID, goal, and milestone are required.");
      return;
    }

    try {
      // Create notification for partner
      const notification = await Notification.create({
        user: partnerId,
        message: `Your partner (User ID: ${userId}) made progress on the milestone "${milestone}" for the goal "${goal}".`,
        type: "partner-notification",
      });

      // Send success response
      sendResponse(res, 200, true, "Partner notified successfully.", { notification });
    } catch (error) {
      logger.error("Error notifying partner", {
        error,
        partnerId,
        userId,
      });
      next(error); // Forward the error to middleware
    }
  },
);


/**
 * @desc Add a partner and send a notification
 * @route POST /api/partner/add
 * @access Private
 */
export const addPartnerNotification = catchAsync(
  async (
    req: Request<{}, {}, { partnerId: string; userId: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { partnerId, userId } = sanitize(req.body);
    const senderId = req.user?.id; // Get sender ID from authenticated user

    // Validate inputs
    if (!partnerId || !userId || !senderId) {
      sendResponse(res, 400, false, "Partner ID, User ID, and Sender ID are required.");
      return;
    }

    // Create partner notification
    const notification = await Notification.create({
      user: partnerId,
      message: `You have been added as a partner by User ID: ${senderId}.`,
      type: "partner-notification",
    });

    sendResponse(res, 200, true, "Partner added and notified successfully.", { notification });
  },
);


/**
 * @desc Get partner notifications
 * @route GET /api/partner/notifications
 * @access Private
 */
export const getPartnerNotifications = catchAsync(
  async (
    req: Request<{}, {}, {}, { page?: string; limit?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);

    try {
      // Fetch partner notifications
      const notifications = await Notification.find({ user: userId, type: "partner-notification" })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalNotifications = await Notification.countDocuments({
        user: userId,
        type: "partner-notification",
      });

      // Handle no notifications case
      if (!notifications || notifications.length === 0) {
        sendResponse(res, 404, false, "No partner notifications found.");
        return;
      }

      // Send success response
      sendResponse(res, 200, true, "Partner notifications fetched successfully.", {
        notifications,
        pagination: {
          total: totalNotifications,
          currentPage: page,
          totalPages: Math.ceil(totalNotifications / limit),
        },
      });
    } catch (error) {
      logger.error("Error fetching partner notifications", {
        error,
        userId,
      });
      next(error); // Pass the error to middleware
    }
  },
);
