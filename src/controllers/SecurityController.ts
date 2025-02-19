import type { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import rateLimit from "express-rate-limit";

// Rate limiter for login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts. Please try again later.",
});

/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = catchAsync(
  async (
    req: Request<{}, any, { email: string; password: string }>,
    res: Response,
  ): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      sendResponse(res, 400, false, "Email and password are required");
      return;
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      sendResponse(res, 401, false, "Invalid email or password");
      return;
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
    );

    sendResponse(res, 200, true, "Login successful", { token, refreshToken });
  },
);

/**
 * @desc Request password reset
 * @route POST /api/auth/request-password-reset
 * @access Public
 */
export const requestPasswordReset = catchAsync(
  async (
    req: Request<{}, any, { email: string }>,
    res: Response,
  ): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      sendResponse(res, 400, false, "Email is required");
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get(
      "host",
    )}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Use this link: ${resetUrl}`,
        html: `<a href="${resetUrl}">${resetUrl}</a>`,
      });
      sendResponse(res, 200, true, "Password reset email sent");
    } catch {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      sendResponse(res, 500, false, "Failed to send password reset email");
    }
  },
);

/**
 * @desc Reset password
 * @route POST /api/auth/reset-password/:token
 * @access Public
 */
export const resetPassword = catchAsync(
  async (
    req: Request<{ token: string }, any, { newPassword: string }>,
    res: Response,
  ): Promise<void> => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      sendResponse(res, 400, false, "Token and new password are required");
      return;
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      sendResponse(res, 400, false, "Invalid or expired token");
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    sendResponse(res, 200, true, "Password reset successful");
  },
);

/**
 * @desc Setup Two-Factor Authentication
 * @route POST /api/auth/setup-2fa/:userId
 * @access Private
 */
export const setupTwoFactorAuth = catchAsync(
  async (
    req: Request<{ userId: string }, any, {}>,
    res: Response,
  ): Promise<void> => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    const secret = crypto.randomBytes(16).toString("hex");
    user.twoFactorSecret = secret; // Store 2FA secret
    await user.save();

    sendResponse(res, 200, true, "Two-factor authentication setup successful", { secret });
  },
);

/**
 * @desc Verify Two-Factor Authentication
 * @route POST /api/auth/verify-2fa/:userId
 * @access Private
 */
export const verifyTwoFactorAuth = catchAsync(
  async (
    req: Request<{ userId: string }, any, { token: string }>,
    res: Response,
  ): Promise<void> => {
    const { userId } = req.params;
    const { token } = req.body;

    if (!token) {
      sendResponse(res, 400, false, "Token is required");
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      sendResponse(res, 404, false, "User not found or 2FA not enabled");
      return;
    }

    const isValid = token === user.twoFactorSecret; // Replace with actual 2FA validation logic
    if (!isValid) {
      sendResponse(res, 400, false, "Invalid 2FA token");
      return;
    }

    sendResponse(res, 200, true, "Two-factor authentication verified successfully");
  },
);
