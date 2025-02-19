import type { Request, Response, NextFunction } from "express-serve-static-core";
import webPush from "web-push";
import logger from "../utils/winstonLogger"; // Replace with your logger utility

// Validate and configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const EMAIL = process.env.CONTACT_EMAIL;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !EMAIL) {
  throw new Error("Missing VAPID keys or contact email in environment variables.");
}

// Set VAPID details
webPush.setVapidDetails(`mailto:${EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Middleware for handling Web Push notifications
 * @returns {Promise<void>} Resolves after processing the request
 */
export const sendNotification = async (
  req: Request,
  res: Response,
  _next: NextFunction, // Renamed 'next' to '_next' to avoid the unused variable warning
): Promise<void> => {
  try {
    const { subscription, payload } = req.body;

    if (!subscription || !payload) {
      res.status(400).json({ message: "Subscription and payload are required." });
      return;
    }

    await webPush.sendNotification(subscription, JSON.stringify(payload));
    logger.info("Web Push notification sent successfully.");
    res.status(200).json({ message: "Notification sent successfully." });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to send Web Push notification: ${errorMessage}`);
    res.status(500).json({ message: "Failed to send notification.", error: errorMessage });
  }
};
