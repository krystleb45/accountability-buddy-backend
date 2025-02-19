import type { Request, Response, NextFunction } from "express";
import User from "../models/User";
import logger from "../utils/winstonLogger";

// Middleware factory function to dynamically check subscription levels
const checkSubscription = (requiredLevel: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure the user is authenticated
      if (!req.user || !req.user.id) {
        res.status(401).json({ success: false, message: "Unauthorized: User not authenticated." });
        return;
      }

      // Retrieve user from database
      const dbUser = await User.findById(req.user.id);

      if (!dbUser) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }

      // Extract subscription level from 'subscriptions' array
      const userSubscription = (dbUser.subscriptions?.[0] as any)?.level || "free";

      // Define subscription levels and validate access
      const levels = ["free", "standard", "premium"];
      const userIndex = levels.indexOf(userSubscription);
      const requiredIndex = levels.indexOf(requiredLevel);

      if (userIndex < requiredIndex) {
        res.status(403).json({
          success: false,
          message: `Forbidden: Requires ${requiredLevel} subscription.`,
        });
        return;
      }

      // Allow access
      next();
    } catch (error) {
      logger.error(`Error in checkSubscription middleware: ${(error as Error).message}`);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  };
};

export default checkSubscription;
