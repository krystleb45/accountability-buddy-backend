// src/api/middleware/authJwt.ts

import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import { createError } from "./errorHandler";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

interface JwtPayload {
  userId: string;
  role:   string;
}

export const protect: RequestHandler = catchAsync(async (req, _res, next) => {
  let token: string | undefined;

  // 1) Try Bearer Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  // 2) Fallback to NextAuth session cookie if no header
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(
      /next-auth\.session-token=([^;]+)/
    );
    if (match) {
      token = decodeURIComponent(match[1]);
      logger.info("🔑 Using token from next-auth.session-token cookie");
    }
  }

  // 3) If still no token, bail
  if (!token) {
    return next(createError("Unauthorized: No token provided", 401));
  }

  // 4) Verify JWT
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    logger.error("ACCESS_TOKEN_SECRET not set");
    return next(createError("Server misconfiguration", 500));
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, secret) as JwtPayload;
  } catch (err) {
    logger.warn("❌ Invalid token:", err);
    return next(createError("Unauthorized: Invalid token", 401));
  }

  // 5) Load user
  const userDoc = await User.findById(decoded.userId)
    .select("-password")
    .lean();
  if (!userDoc) {
    logger.warn(`❌ User not found: ${decoded.userId}`);
    return next(createError("Unauthorized: User not found", 401));
  }

  // 6) Attach to `req.user`
  (req as AuthenticatedRequest).user = {
    id:          userDoc._id.toString(),
    username:    userDoc.username,
    email:       userDoc.email,
    role:        userDoc.role,
    isAdmin:     userDoc.role === "admin",
    permissions: userDoc.permissions ?? [],
    // …any other props you need…
  };

  logger.info(`✅ Authenticated user ${userDoc.email}`);
  next();
});
