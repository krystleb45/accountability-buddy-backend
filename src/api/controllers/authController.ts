// src/api/controllers/authController.ts

import type { RequestHandler } from "express";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AuthService from "../services/AuthService";
import { logger } from "../../utils/winstonLogger";

//
// ─── POST /api/auth/register ─────────────────────────────────────────────────
//
export const register: RequestHandler = catchAsync(async (req, res, next) => {
  const { email, password, username } = req.body as {
    email?: string;
    password?: string;
    username?: string;
  };

  if (!email || !password || !username) {
    return next(createError("Email, username, and password are all required", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedUsername = username.trim();

  // check for existing user
  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: trimmedUsername }],
  });
  if (existing) {
    return next(createError("A user with that email or username already exists", 400));
  }

  // hash & save
  const hashedPassword = await AuthService.hashPassword(password);
  const user = new User({
    email: normalizedEmail,
    username: trimmedUsername,
    password: hashedPassword,
  });
  await user.save();

  // issue tokens
  const accessToken = await AuthService.generateToken({
    _id: user._id.toString(),
    role: user.role,
  });
  const refreshToken = await AuthService.refreshToken(accessToken);

  sendResponse(
    res,
    201,
    true,
    "User registered successfully",
    { accessToken, refreshToken }
  );
});

//
// ─── POST /api/auth/login ────────────────────────────────────────────────────
//
export const login: RequestHandler = catchAsync(async (req, res, next) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return next(createError("Email and password are required", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  logger.info("→ [login] received payload:", { email: normalizedEmail });

  // 1) Lookup user
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password"
  );
  if (!user) {
    return next(createError("Invalid credentials", 401));
  }

  // 2) Compare passwords
  const isMatch = await AuthService.comparePassword(
    password,
    user.password!
  );
  if (!isMatch) {
    return next(createError("Invalid credentials", 401));
  }

  // 3) Issue tokens
  const accessToken = await AuthService.generateToken({
    _id: user._id.toString(),
    role: user.role,
  });

  // 4) Send flat payload that NextAuth expects
  res.status(200).json({
    id: user._id.toString(),
    name: user.username,
    email: user.email,
    role: user.role,
    accessToken,
  });
});

//
// ─── POST /api/auth/refresh-token ──────────────────────────────────────────
//
export const refreshToken: RequestHandler = catchAsync(async (req, res, next) => {
  const { refreshToken: oldToken } = req.body as { refreshToken?: string };
  if (!oldToken) {
    return next(createError("Refresh token is required", 401));
  }

  try {
    // this returns a new access token
    const newAccessToken = await AuthService.refreshToken(oldToken);
    sendResponse(res, 200, true, "Token refreshed successfully", {
      accessToken: newAccessToken,
    });
  } catch (err) {
    logger.error(`Refresh token error: ${(err as Error).message}`);
    next(createError("Invalid or expired refresh token", 401));
  }
});

//
// ─── POST /api/auth/logout ─────────────────────────────────────────────────
//
export const logout: RequestHandler = (_req, res) => {
  // optionally revoke tokens here
  sendResponse(res, 200, true, "Logged out successfully", {});
};

//
// ─── GET /api/auth/me ────────────────────────────────────────────────────────
//
export const getCurrentUser: RequestHandler = catchAsync(async (req, res, next) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return next(createError("Not authenticated", 401));
  }

  const user = await User.findById(userId)
    .select("-password")
    .lean();
  if (!user) {
    return next(createError("User not found", 404));
  }

  sendResponse(res, 200, true, "User fetched successfully", { user });
});

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
};
