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

export const protect: RequestHandler = catchAsync(
  async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(createError("Unauthorized: No token provided", 401));
    }

    const token = authHeader.slice(7).trim();
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      logger.error("ACCESS_TOKEN_SECRET not set in environment");
      return next(createError("Server misconfiguration", 500));
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      logger.warn("❌ Invalid token:", err);
      return next(createError("Unauthorized: Invalid token", 401));
    }

    // Fetch user by the same key name used in your token payload
    const user = await User.findById(decoded.userId)
      .select("-password")
      .lean();
    if (!user) {
      logger.warn(`❌ User not found: ${decoded.userId}`);
      return next(createError("Unauthorized: User not found", 401));
    }

    // Attach to req for downstream handlers
    (req as AuthenticatedRequest).user = {
      id:          user._id.toString(),
      username:    user.username,
      email:       user.email,
      role:        user.role,
      isAdmin:     user.role === "admin",
      permissions: (user as any).permissions ?? [],
    };

    next();
  }
);
