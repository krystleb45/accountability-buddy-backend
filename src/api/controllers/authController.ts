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
    return next(createError("All fields are required", 400));
  }

  // check duplicates by email or username
  const existing = await User.findOne({
    $or: [
      { email: email.toLowerCase().trim() },
      { username: username.trim() },
    ],
  });
  if (existing) {
    return next(
      createError("User with that email or username already exists", 400)
    );
  }

  // hash + save
  const hashed = await AuthService.hashPassword(password);
  const user = new User({
    email:    email.toLowerCase().trim(),
    username: username.trim(),
    password: hashed,
  });
  await user.save();

  // issue tokens
  const accessToken  = await AuthService.generateToken({
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
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return next(createError("Email and password are required", 400));
  }

  // find by email
  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select("+password");
  if (!user) {
    return next(createError("Invalid credentials", 400));
  }

  const match = await AuthService.comparePassword(password, user.password);
  if (!match) {
    return next(createError("Invalid credentials", 400));
  }

  const accessToken  = await AuthService.generateToken({
    _id:  user._id.toString(),
    role: user.role,
  });
  const refreshToken = await AuthService.refreshToken(accessToken);

  sendResponse(
    res,
    200,
    true,
    "Login successful",
    {
      id:           user._id.toString(),
      username:     user.username,
      email:        user.email,
      role:         user.role,
      accessToken,
      refreshToken,
    }
  );
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
    const newToken = await AuthService.refreshToken(oldToken);
    sendResponse(res, 200, true, "Tokens refreshed successfully", {
      accessToken: newToken,
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
  sendResponse(res, 200, true, "Logged out successfully");
};

//
// ─── GET /api/auth/me ───────────────────────────────────────────────────────
//
export const getCurrentUser: RequestHandler = catchAsync(async (req, res, next) => {
  // your auth middleware attaches user to req.user
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return next(createError("Not authenticated", 401));
  }

  const user = await User.findById(userId).select("-password");
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
