import type { Request, Response, NextFunction } from "express";
import User from "../models/User";
import { logger } from "../utils/winstonLogger"; // ✅ Logging for better debugging

/**
 * ✅ Middleware to check if a user has an active subscription
 */
const checkSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // ✅ Ensure req.user exists before proceeding
    if (!req.user || !req.user.id) {
      logger.warn("❌ checkSubscription: req.user is missing or not set.");
      res.status(401).json({ success: false, message: "Unauthorized: User not authenticated." });
      return;
    }

    // ✅ Retrieve user from database
    const dbUser = await User.findById(req.user.id).select("subscription_status");

    if (!dbUser) {
      logger.warn(`❌ checkSubscription: User not found in DB. UserID: ${req.user.id}`);
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    // ✅ Check subscription status
    if (dbUser.subscription_status !== "active") {
      logger.warn(`❌ checkSubscription: Access denied. UserID: ${req.user.id}, Status: ${dbUser.subscription_status}`);
      res.status(403).json({ success: false, message: "Access denied: Subscription required." });
      return;
    }

    logger.info(`✅ checkSubscription: User ${req.user.id} has an active subscription. Proceeding...`);
    next(); // ✅ Proceed to next middleware
  } catch (error) {
    logger.error(`❌ checkSubscription: Unexpected error - ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export default checkSubscription;
