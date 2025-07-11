// src/api/middleware/authJwt.ts - FIXED VERSION

import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import { createError } from "./errorHandler";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

interface JwtPayload {
  userId: string;
  role: string;
}

export const protect: RequestHandler = catchAsync(async (req, _res, next) => {
  let token: string | undefined;

  // ONLY use Bearer Authorization header (sent by your Next.js proxy)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
    logger.info("🔑 Using token from Authorization header");
  }

  // REMOVED: NextAuth session cookie fallback
  // NextAuth cookies are encrypted, not JWT tokens!
  // Your proxy correctly sends the real JWT in Authorization header

  if (!token) {
    logger.warn("❌ No token found in Authorization header");
    return next(createError("Unauthorized: No token provided", 401));
  }

  // Verify JWT using the correct secret
  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    logger.error("ACCESS_TOKEN_SECRET/JWT_SECRET not set");
    return next(createError("Server misconfiguration", 500));
  }

  let decoded: JwtPayload;
  try {
    logger.info(`🔍 Verifying token: ${token.substring(0, 20)}...`);
    decoded = jwt.verify(token, secret) as JwtPayload;
    logger.info(`✅ Token verified for user: ${decoded.userId}`);
  } catch (err: any) {
    logger.warn("❌ Invalid token:", err.message);
    return next(createError("Unauthorized: Invalid token", 401));
  }

  // Load user from database
  const userDoc = await User.findById(decoded.userId)
    .select("-password")
    .lean();

  if (!userDoc) {
    logger.warn(`❌ User not found: ${decoded.userId}`);
    return next(createError("Unauthorized: User not found", 401));
  }

  // Attach user to request
  (req as AuthenticatedRequest).user = {
    id: userDoc._id.toString(),
    username: userDoc.username,
    email: userDoc.email,
    role: userDoc.role,
    isAdmin: userDoc.role === "admin",
    permissions: userDoc.permissions ?? [],
    trial_start_date: userDoc.trial_start_date,
    subscription_status: userDoc.subscription_status as any,
    next_billing_date: userDoc.next_billing_date,
    points: userDoc.points,
    rewards: userDoc.rewards,
    streakCount: userDoc.streakCount,
    isVerified: userDoc.isVerified,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };

  logger.info(`✅ Authenticated user ${userDoc.email}`);
  next();
});
