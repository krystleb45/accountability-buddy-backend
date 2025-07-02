// src/api/controllers/authController.ts - Updated with subscription support

import type { RequestHandler } from "express";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AuthService from "../services/AuthService";
import { logger } from "../../utils/winstonLogger";

interface RegisterRequestBody {
  email?: string;
  password?: string;
  name?: string;
  selectedPlan?: string;
  billingCycle?: "monthly" | "yearly";
}

//
// ─── POST /api/auth/register ─────────────────────────────────────────────────
//
export const register: RequestHandler = catchAsync(async (req, res, next) => {
  const {
    email,
    password,
    name,
    selectedPlan = "free-trial",
    billingCycle = "monthly"
  } = req.body as RegisterRequestBody;

  if (!email || !password || !name) {
    return next(createError("Email, name, and password are all required", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  // Validate subscription plan
  const validPlans = ["free-trial", "basic", "pro", "elite"];
  if (!validPlans.includes(selectedPlan)) {
    return next(createError("Invalid subscription plan selected", 400));
  }

  // Validate billing cycle
  const validCycles = ["monthly", "yearly"];
  if (!validCycles.includes(billingCycle)) {
    return next(createError("Invalid billing cycle selected", 400));
  }

  // Check for existing user
  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: trimmedName }],
  });
  if (existing) {
    return next(createError("A user with that email or username already exists", 400));
  }

  // Hash password - let the User model handle this in pre-save middleware
  const user = new User({
    email: normalizedEmail,
    username: trimmedName, // Use name as username
    password: password, // Will be hashed by pre-save middleware
    subscriptionTier: selectedPlan as any,
    subscription_status: selectedPlan === "free-trial" ? "trial" : "active",
    billing_cycle: billingCycle,
    trial_start_date: new Date(),
    // trial_end_date is set by default in the schema (14 days from now)
  });

  await user.save();

  logger.info(`✅ User registered successfully: ${normalizedEmail} with plan: ${selectedPlan}`);

  // Issue tokens
  const accessToken = await AuthService.generateToken({
    _id: user._id.toString(), // Changed back to _id to match AuthService
    role: user.role,
  });

  // Prepare user data for response (matching your frontend expectations)
  const userData = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscription_status: user.subscription_status,
    trial_end_date: user.trial_end_date?.toISOString(),
    isInTrial: user.isInTrial(),
  };

  // Return success response with token and user data
  sendResponse(
    res,
    201,
    true,
    "User registered successfully",
    {
      token: accessToken,
      user: userData,
      accessToken,
    }
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
    _id: user._id.toString(), // Changed back to _id to match AuthService
    role: user.role,
  });

  // 4) Send response with subscription data
  res.status(200).json({
    id: user._id.toString(),
    name: user.username,
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscription_status: user.subscription_status,
    trial_end_date: user.trial_end_date?.toISOString(),
    isInTrial: user.isInTrial(),
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

  // Check if trial has expired and update status
  if (user.isInTrial() && user.trial_end_date && new Date() > user.trial_end_date) {
    await User.findByIdAndUpdate(userId, {
      subscription_status: "expired"
    });
    user.subscription_status = "expired";
  }

  sendResponse(res, 200, true, "User fetched successfully", {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      subscription_status: user.subscription_status,
      trial_end_date: user.trial_end_date?.toISOString(),
      isInTrial: user.isInTrial(),
    }
  });
});

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
};
