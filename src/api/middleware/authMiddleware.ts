// src/api/middleware/authMiddleware.ts

import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import { createError } from "./errorHandler";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

interface TokenPayload {
  userId: string;
  role:   "user" | "admin" | "moderator" | "military";
  permissions?: string[];
}

/**
 * Protects routes by verifying a Bearer JWT and attaching `req.user`.
 * ONLY looks at the Authorization header—no more cookie fallback.
 */
export const protect: RequestHandler = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(createError("Unauthorized: No token provided", 401));
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    logger.error("Missing ACCESS_TOKEN_SECRET in environment");
    return next(createError("Server misconfiguration", 500));
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, secret) as TokenPayload;
  } catch (err) {
    logger.warn(`❌ Invalid token: ${(err as Error).message}`);
    return next(createError("Unauthorized: Invalid token", 401));
  }

  const userDoc = await User.findById(decoded.userId).select("-password").lean();
  if (!userDoc) {
    logger.warn(`❌ User not found. ID: ${decoded.userId}`);
    return next(createError("Unauthorized: User not found", 401));
  }

  (req as AuthenticatedRequest).user = {
    id:                  userDoc._id.toString(),
    username:            userDoc.username,
    email:               userDoc.email,
    role:                userDoc.role,
    isAdmin:             userDoc.role === "admin",
    permissions:         userDoc.permissions ?? [],
    trial_start_date:    (userDoc as any).trial_start_date,
    subscription_status: (userDoc as any).subscription_status,
    next_billing_date:   (userDoc as any).next_billing_date,
    points:              (userDoc as any).points ?? 0,
    rewards:             (userDoc as any).rewards ?? [],
    streakCount:         (userDoc as any).streakCount ?? 0,
    isVerified:          (userDoc as any).isVerified,
    createdAt:           (userDoc as any).createdAt,
    updatedAt:           (userDoc as any).updatedAt,
  };

  logger.info(`✅ Authenticated user ${userDoc.email}`);
  next();
});

// ─── 2) RESTRICT-TO ― only allow specific roles
export const restrictTo = (
  ...roles: ("admin" | "moderator" | "military")[]
): RequestHandler => {
  return (req, _res, next) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !roles.includes(authReq.user.role as any)) {
      logger.warn(
        `❌ Access denied for ${authReq.user?.email}. Requires one of: ${roles.join(
          ", "
        )}`
      );
      return next(createError("Forbidden: You don't have the required role", 403));
    }
    next();
  };
};

// ─── 3) MILITARY-AUTH ― only allow “military” role
export const militaryAuth: RequestHandler = catchAsync(async (req, _res, next) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return next(createError("Unauthorized: No user attached", 401));
  }
  if (authReq.user.role !== "military") {
    logger.warn(`🔒 Military-only access attempted by ${authReq.user.email}`);
    return next(createError("Forbidden: Access restricted to military members", 403));
  }
  next();
});
