// src/api/controllers/authController.ts
import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";
import AuthService from "../services/AuthService";

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
export const register = catchAsync(
  async (
    req: Request<{}, {}, { email: string; password: string; username: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return next(createError("All fields are required", 400));
    }

    // check duplicate
    const exists = await User.findOne({ email });
    if (exists) {
      return next(createError("User already exists", 400));
    }

    // hash password
    const hashed = await AuthService.hashPassword(password);

    // create user
    const newUser = new User({ email, username, password: hashed });
    await newUser.save();

    // generate tokens
    const accessToken  = await AuthService.generateToken({ _id: newUser._id.toString(), role: newUser.role });
    const refreshToken = await AuthService.refreshToken(accessToken);

    sendResponse(
      res,
      201,
      true,
      "User registered successfully",
      { accessToken, refreshToken }
    );
  }
);

/**
 * @desc    Log in an existing user
 * @route   POST /api/auth/login
 */
export const login = catchAsync(
  async (
    req: Request<{}, {}, { email: string; password: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(createError("Email and password are required", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(createError("Invalid credentials", 400));
    }

    const match = await AuthService.comparePassword(password, user.password);
    if (!match) {
      return next(createError("Invalid credentials", 400));
    }

    const accessToken  = await AuthService.generateToken({ _id: user._id.toString(), role: user.role });
    const refreshToken = await AuthService.refreshToken(accessToken);

    sendResponse(res, 200, true, "Login successful", {
      id:       user._id.toString(),
      username: user.username,
      email:    user.email,
      role:     user.role,
      accessToken,
      refreshToken,
    });
  }
);

/**
 * @desc    Refresh JWT tokens
 * @route   POST /api/auth/refresh-token
 */
export const refreshToken = catchAsync(
  async (
    req: Request<{}, {}, { refreshToken: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { refreshToken: oldToken } = req.body;
    if (!oldToken) {
      return next(createError("Refresh token is required", 401));
    }

    try {
      const newToken = await AuthService.refreshToken(oldToken);
      sendResponse(res, 200, true, "Tokens refreshed successfully", { accessToken: newToken });
    } catch (err) {
      logger.error(`Refresh token error: ${(err as Error).message}`);
      return next(createError("Invalid or expired refresh token", 401));
    }
  }
);

/**
 * @desc    Log the user out
 * @route   POST /api/auth/logout
 */
export const logout = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    // If you store refresh tokens, revoke it here.
    sendResponse(res, 200, true, "Logged out successfully");
  }
);

/**
 * @desc    Get current user's profile
 * @route   GET /api/auth/me
 */
export const getCurrentUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Not authenticated", 401));
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return next(createError("User not found", 404));
    }

    sendResponse(res, 200, true, "User details fetched successfully", { user });
  }
);

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
};
