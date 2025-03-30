import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { logger } from "../../utils/winstonLogger"; // ✅ Logging for debugging

/**
 * ✅ Extend Express Request type to include `user` (NO explicit export needed)
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      email?: string;
      id: string;
      role: "user" | "admin" | "moderator";
    };
  }
}

/**
 * ✅ Middleware to verify authentication and attach user data
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("❌ authMiddleware: No valid authorization token provided.");
      res.status(401).json({ success: false, message: "Unauthorized: No token provided." });  // Return response here and stop execution
      return; // Ends middleware execution
    }

    const token = authHeader.split(" ")[1];

    let decoded: { id: string; role: "user" | "admin" | "moderator" };

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as {
        id: string;
        role: "user" | "admin" | "moderator";
      };
    } catch (error) {
      logger.error(`❌ authMiddleware: JWT verification failed - ${(error as Error).message}`);
      res.status(401).json({ success: false, message: "Unauthorized: Invalid token." }); // Return response and stop execution
      return; // Ends middleware execution
    }

    // ✅ Find user in database
    const user = await User.findById(decoded.id).select("id role email");

    if (!user) {
      logger.warn(`❌ authMiddleware: User not found. Token ID: ${decoded.id}`);
      res.status(401).json({ success: false, message: "Unauthorized: User not found." }); // Return response and stop execution
      return; // Ends middleware execution
    }

    // ✅ Attach user data to the request
    req.user = { id: user.id, role: user.role as "user" | "admin" | "moderator", email: user.email };

    logger.info(`✅ authMiddleware: User ${user.id} authenticated successfully.`);
    next(); // Proceed to next middleware
  } catch (error) {
    logger.error(`❌ authMiddleware: Unexpected error - ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Internal server error during authentication." }); // Return response and stop execution
  }
};

/**
 * ✅ Middleware to restrict access to specific roles (e.g., admin)
 */
export const restrictTo = (role: "admin" | "moderator") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.role || req.user.role !== role) {
      logger.warn(`❌ restrictTo: Access denied for user ${req.user?.id}. Required role: ${role}`);
      res.status(403).json({ success: false, message: "Forbidden: You don't have permission." }); // Return response and stop execution
      return; // Ends middleware execution
    }
    next(); // Proceed to next middleware if role matches
  };
};
