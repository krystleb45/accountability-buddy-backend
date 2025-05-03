// src/api/middleware/authMiddleware.ts

import { RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/User";
import { logger } from "../../utils/winstonLogger";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";

interface TokenPayload extends JwtPayload {
  userId?: string;
  role: "user" | "admin" | "moderator" | "military";
  permissions?: string[];
}

/**
 * Protects routes by verifying a Bearer JWT and attaching `req.user`.
 */
export const protect: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("❌ No token provided.");
    res.status(401).json({ success: false, message: "Unauthorized: No token provided." });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    logger.error("Missing ACCESS_TOKEN_SECRET in environment");
    res.status(500).json({ success: false, message: "Server error: Token secret missing" });
    return;
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, secret) as TokenPayload;
  } catch (err) {
    logger.error(`❌ Invalid token: ${(err as Error).message}`);
    res.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
    return;
  }

  const userId = decoded.userId;
  if (!userId) {
    logger.warn("❌ Token payload missing userId");
    res.status(401).json({ success: false, message: "Unauthorized: Invalid token payload." });
    return;
  }

  const userDoc = await User.findById(userId)
    .select(
      "username email role trial_start_date subscription_status next_billing_date points rewards streakCount isVerified permissions createdAt updatedAt"
    )
    .lean();

  if (!userDoc) {
    logger.warn(`❌ User not found. ID: ${userId}`);
    res.status(401).json({ success: false, message: "Unauthorized: User not found." });
    return;
  }

  // attach minimal user info
  (req as AuthenticatedRequest).user = {
    id: userDoc._id.toString(),
    username: userDoc.username,
    email: userDoc.email,
    role: userDoc.role,
    isAdmin: userDoc.role === "admin",
    trial_start_date: userDoc.trial_start_date,
    subscription_status: userDoc.subscription_status,
    next_billing_date: userDoc.next_billing_date,
    points: userDoc.points ?? 0,
    rewards: userDoc.rewards ?? [],
    streakCount: userDoc.streakCount ?? 0,
    isVerified: userDoc.isVerified,
    permissions: userDoc.permissions ?? [],
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };

  logger.info(`✅ Authenticated user ${userDoc.email}`);
  next();
};

/**
 * Restricts access to certain roles.
 */
export const restrictTo = (...roles: ("admin" | "moderator" | "military")[]): RequestHandler => {
  return (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !roles.includes(authReq.user.role as any)) {
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
};

/**
 * Only allows users with the "military" role.
 */
export const militaryAuth: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user || authReq.user.role !== "military") {
    logger.warn(`🔒 Military-only access attempted by ${authReq.user?.email}`);
    res.status(403).json({
      success: false,
      message: "Forbidden: Access restricted to military members.",
    });
    return;
  }
  next();
};
