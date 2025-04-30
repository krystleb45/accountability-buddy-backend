// src/api/controllers/NewsletterController.ts
import type { Request, Response, NextFunction } from "express";
import Newsletter from "../models/Newsletter";
import { logger } from "../../utils/winstonLogger";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc    Subscribe to the newsletter
 * @route   POST /api/newsletter/signup
 * @access  Public
 */
export const signupNewsletter = catchAsync(
  async (req: Request<{}, {}, { email: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { email } = req.body;
    if (!email?.trim()) {
      sendResponse(res, 400, false, "Email is required.");
      return;
    }

    // find or create subscriber
    let subscriber = await Newsletter.findOrCreate(email.trim().toLowerCase());

    if (subscriber.status === "subscribed") {
      sendResponse(res, 400, false, "Email is already subscribed.");
      return;
    }

    // resubscribe
    subscriber.status = "subscribed";
    subscriber.subscribedAt = new Date();
    await subscriber.regenerateUnsubscribeToken();
    await subscriber.save();

    logger.info(`Newsletter subscription (resubscribe): ${email}`);
    sendResponse(res, 201, true, "Successfully subscribed to the newsletter.");
  }
);

/**
 * @desc    Unsubscribe from the newsletter
 * @route   GET /api/newsletter/unsubscribe
 * @access  Public
 */
export const unsubscribeNewsletter = catchAsync(
  async (req: Request<{}, {}, {}, { token?: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const token = req.query.token;
    if (typeof token !== "string") {
      sendResponse(res, 400, false, "Invalid or missing token.");
      return;
    }

    // find the subscriber by token
    const subscriber = await Newsletter.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      sendResponse(res, 404, false, "Subscriber not found.");
      return;
    }

    // use the instance method to validate and unsubscribe
    await subscriber.unsubscribe(token);
    // clear token so they can’t unsubscribe twice
    subscriber.unsubscribeToken = undefined;
    await subscriber.save();

    logger.info(`Newsletter unsubscription: ${subscriber.email}`);
    sendResponse(res, 200, true, "Successfully unsubscribed from the newsletter.");
  }
);

/**
 * @desc    Get all subscribers (Admin only)
 * @route   GET /api/newsletter/subscribers
 * @access  Private (Admin)
 */
export const getSubscribers = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const subscribers = await Newsletter.findSubscribed();
    if (subscribers.length === 0) {
      sendResponse(res, 404, false, "No subscribers found.");
      return;
    }
    sendResponse(res, 200, true, "Subscribers fetched successfully.", { subscribers });
  }
);
