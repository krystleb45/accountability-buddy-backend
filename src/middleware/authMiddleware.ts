import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { logger } from "../utils/winstonLogger"; // ✅ Logging for debugging

/**
 * Extend Express Request type to include `user`
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: "user" | "admin" | "moderator";
    };
  }
}

/**
 * ✅ Middleware to verify authentication and attach user data
 */
const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("❌ authMiddleware: No valid authorization token provided.");
      res.status(401).json({ success: false, message: "Unauthorized: No token provided." });
      return;
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
      res.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
      return;
    }

    // ✅ Find user in database
    const user = await User.findById(decoded.id).select("id role");

    if (!user) {
      logger.warn(`❌ authMiddleware: User not found. Token ID: ${decoded.id}`);
      res.status(401).json({ success: false, message: "Unauthorized: User not found." });
      return;
    }

    // ✅ Attach user data to the request
    req.user = { id: user.id, role: user.role as "user" | "admin" | "moderator" };

    logger.info(`✅ authMiddleware: User ${user.id} authenticated successfully.`);
    next(); // ✅ Proceed to next middleware
  } catch (error) {
    logger.error(`❌ authMiddleware: Unexpected error - ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Internal server error during authentication." });
  }
};

export default authMiddleware;
