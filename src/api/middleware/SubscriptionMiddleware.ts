import { Request, Response, NextFunction } from "express";
import { User } from "../models/User"; // Adjust the import path as necessary
import { ISubscription } from "../models/Subscription"; // Adjust the import path as necessary

// Middleware to validate subscription status
export const validateSubscription = async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  try {
    const userId = req.user?.id; // Assuming the user ID is attached to the request by a previous authentication middleware
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Fetch the user from the database, including the populated subscription field
    const user = await User.findById(userId).populate("subscriptions");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { subscriptions } = user;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(403).json({ message: "No active subscription found" });
    }

    // Filter out only populated subscription documents (objects with a "status" property)
    const activeSubscription = subscriptions
      .filter((sub): sub is ISubscription => typeof sub === "object" && "status" in sub)
      .find(sub => sub.status === "active");

    // If no active subscription found, deny access
    if (!activeSubscription) {
      return res.status(403).json({
        message: "Your subscription has expired or the free trial has ended. Please renew your subscription.",
      });
    }

    // If everything is valid, proceed to the next middleware
    return next() as unknown as Response<any, Record<string, any>>;
  } catch (error) {
    console.error("Error in subscription validation middleware", error);
    return res.status(500).json({ message: "Server error during subscription validation" });
  }
};
