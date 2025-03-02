import type { Request, Response, NextFunction, RequestHandler } from "express";
import User from "../models/User";
import { logger } from "../utils/winstonLogger"; // ✅ Logging for better debugging

/**
 * ✅ Middleware factory to check if a user has an active subscription
 * @param requiredStatus - The required subscription status (e.g., "trial", "paid")
 * @returns Express middleware function
 */
const checkSubscription = (requiredStatus: "trial" | "paid"): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn("❌ checkSubscription: req.user is missing or not set.");
        res.status(401).json({ success: false, message: "Unauthorized: User not authenticated." });
        return; // ✅ Ensures function returns void
      }

      // ✅ Retrieve user from database
      const dbUser = await User.findById(req.user.id).select("subscription_status");

      if (!dbUser) {
        logger.warn(`❌ checkSubscription: User not found in DB. UserID: ${req.user.id}`);
        res.status(404).json({ success: false, message: "User not found." });
        return; // ✅ Ensures function returns void
      }

      // ✅ Validate subscription status
      if (requiredStatus === "paid" && dbUser.subscription_status !== "active") {
        logger.warn(`❌ checkSubscription: Access denied. UserID: ${req.user.id}, Status: ${dbUser.subscription_status}`);
        res.status(403).json({ success: false, message: "Access denied: Paid subscription required." });
        return; // ✅ Ensures function returns void
      }

      if (requiredStatus === "trial" && !["active", "trial"].includes(dbUser.subscription_status)) {
        logger.warn(`❌ checkSubscription: Trial access denied. UserID: ${req.user.id}, Status: ${dbUser.subscription_status}`);
        res.status(403).json({ success: false, message: "Access denied: Trial or paid subscription required." });
        return; // ✅ Ensures function returns void
      }

      logger.info(`✅ checkSubscription: User ${req.user.id} has valid access (${dbUser.subscription_status}). Proceeding...`);
      next(); // ✅ Proceed to next middleware
    } catch (error) {
      logger.error(`❌ checkSubscription: Unexpected error - ${(error as Error).message}`);
      next(error); // ✅ Proper error propagation
    }
  };
};

export default checkSubscription;
