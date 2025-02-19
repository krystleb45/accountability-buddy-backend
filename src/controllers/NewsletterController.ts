import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import Newsletter from "../models/Newsletter"; // Assuming Newsletter model exists
import logger from "../utils/winstonLogger"; // Logger utility
import sendResponse from "../utils/sendResponse"; // Response utility
import catchAsync from "../utils/catchAsync"; // Async error handler

/**
 * @desc    Subscribe to the newsletter
 * @route   POST /api/newsletter/signup
 * @access  Public
 */
export const signupNewsletter = catchAsync(
  async (
    req: Request<{}, {}, { email: string }>, // Explicit request body type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { email } = req.body;

    // Validate email
    if (!email || !email.trim()) {
      sendResponse(res, 400, false, "Email is required.");
      return;
    }

    // Check if email already exists
    let subscriber = await Newsletter.findOne({ email });
    if (subscriber && subscriber.status === "subscribed") {
      sendResponse(res, 400, false, "Email is already subscribed.");
      return;
    }

    // If email exists but unsubscribed, resubscribe
    if (subscriber && subscriber.status === "unsubscribed") {
      subscriber.status = "subscribed";
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribeToken = crypto.randomBytes(16).toString("hex");
      await subscriber.save();
    } else {
      // Create a new subscriber
      subscriber = await Newsletter.create({
        email,
        status: "subscribed",
        subscribedAt: new Date(),
        unsubscribeToken: crypto.randomBytes(16).toString("hex"),
      });
    }

    logger.info(`Newsletter subscription: ${email}`);
    sendResponse(res, 201, true, "Successfully subscribed to the newsletter.");
  },
);

/**
 * @desc    Unsubscribe from the newsletter
 * @route   GET /api/newsletter/unsubscribe
 * @access  Public
 */
export const unsubscribeNewsletter = catchAsync(
  async (
    req: Request<{}, {}, {}, { token: string }>, // Explicit query type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { token } = req.query;

    // Validate token
    if (!token || typeof token !== "string") {
      sendResponse(res, 400, false, "Invalid or missing token.");
      return;
    }

    // Find subscriber by unsubscribe token
    const subscriber = await Newsletter.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      sendResponse(res, 404, false, "Subscriber not found.");
      return;
    }

    // Update status to unsubscribed
    subscriber.status = "unsubscribed";
    subscriber.unsubscribeToken = undefined;
    await subscriber.save();

    logger.info(`Newsletter unsubscription: ${subscriber.email}`);
    sendResponse(res, 200, true, "Successfully unsubscribed from the newsletter.");
  },
);
/**
 * @desc    Get all subscribers (Admin only)
 * @route   GET /api/newsletter/subscribers
 * @access  Private (Admin)
 */
export const getSubscribers = catchAsync(
  async (
    _req: Request<{}, {}, {}, {}>, // Explicitly define type for Request
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const subscribers = await Newsletter.find({ status: "subscribed" });

    if (!subscribers || subscribers.length === 0) {
      sendResponse(res, 404, false, "No subscribers found.");
      return;
    }

    sendResponse(res, 200, true, "Subscribers fetched successfully.", {
      subscribers,
    });
  },
);

