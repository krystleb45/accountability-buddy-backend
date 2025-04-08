import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { logger } from "../../utils/winstonLogger";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";

// Define a fallback JWT payload structure
interface JwtPayload {
  id: string;
  role: "user" | "admin" | "moderator" | "military";
  permissions?: string[];
}

// 🔐 Middleware to verify JWT token and attach user data
export const protect: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("❌ No token provided.");
      res.status(401).json({ success: false, message: "Unauthorized: No token provided." });
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as JwtPayload;
    } catch (err) {
      logger.error(`❌ Invalid token: ${(err as Error).message}`);
      res.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
      return;
    }

    const user = await User.findById(decoded.id)
      .select(
        "username email role trial_start_date subscription_status next_billing_date points rewards streakCount isVerified permissions createdAt updatedAt"
      )
      .lean();

    if (!user) {
      logger.warn(`❌ User not found. ID: ${decoded.id}`);
      res.status(401).json({ success: false, message: "Unauthorized: User not found." });
      return;
    }

    // Attach minimal user object to request
    (req as AuthenticatedRequest).user = {
      id: user._id?.toString() || decoded.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.role === "admin",
      trial_start_date: user.trial_start_date,
      subscription_status: user.subscription_status,
      next_billing_date: user.next_billing_date,
      points: user.points ?? 0,
      rewards: user.rewards ?? [],
      streakCount: user.streakCount ?? 0,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: user.permissions ?? [],
    };

    logger.info(`✅ Authenticated user ${user.email}`);
    next();
  } catch (error) {
    logger.error(`🔥 protect middleware error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Internal server error during authentication." });
  }
};

// 🔐 Role-based access control
export const restrictTo =
  (...roles: ("admin" | "moderator" | "military")[]): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as AuthenticatedRequest;

      if (!roles.includes(authReq.user?.role as "admin" | "moderator" | "military")) {

        logger.warn(
          `❌ Access denied for ${authReq.user?.email}. Requires one of: ${roles.join(", ")}`
        );
        res.status(403).json({
          success: false,
          message: "Forbidden: You don't have the required role.",
        });
        return;
      }

      next();
    };

// 🔐 Middleware for military-only access
export const militaryAuth: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== "military") {
      logger.warn(`🔒 Military-only access attempted by ${user?.email}`);
      res.status(403).json({
        success: false,
        message: "Forbidden: Access restricted to military members.",
      });
      return;
    }

    next();
  } catch (error: unknown) {
    logger.error(`🔥 militaryAuth error: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error during military check.",
    });
  }
};
