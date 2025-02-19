import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import logger from "../utils/winstonLogger"; // Logger import

// Helper function to generate access and refresh tokens
const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.ACCESS_TOKEN_SECRET || "default_access_secret",
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" },
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret",
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" },
  );

  return { accessToken, refreshToken };
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = catchAsync(
  async (
    req: Request<{}, {}, { email: string; password: string; username: string }>, // Explicit type for body
    res: Response,
  ) => {
    const { email, password, username } = req.body;

    // Validate required fields
    if (!email || !password || !username) {
      throw createError("All fields are required", 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendResponse(res, 400, false, "User already exists");
      return;
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS || "12", 10),
    );
    const newUser = new User({ email, password: hashedPassword, username });

    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser._id.toString());

    sendResponse(res, 201, true, "User registered successfully", {
      accessToken,
      refreshToken,
    });
  },
);

/**
 * @desc    User login
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = catchAsync(
  async (
    req: Request<{}, {}, { email: string; password: string }>, // Explicit type for body
    res: Response,
    next: NextFunction,
  ) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return next(createError("Email and password are required", 400));
    }

    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(createError("Invalid credentials", 400));
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createError("Invalid credentials", 400));
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    sendResponse(res, 200, true, "User logged in successfully", {
      accessToken,
      refreshToken,
    });
  },
);

/**
 * @desc    Refresh authentication tokens
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = catchAsync(
  async (
    req: Request<{}, {}, { refreshToken: string }>, // Explicit type for body
    res: Response,
    _next: NextFunction,
  ) => {
    const { refreshToken: token } = req.body;

    // Validate refresh token
    if (!token) {
      sendResponse(res, 401, false, "Refresh token is required");
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret",
      ) as { id: string };

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        sendResponse(res, 401, false, "Invalid refresh token");
        return;
      }

      // Generate new tokens
      const { accessToken, refreshToken } = generateTokens(user._id.toString());

      sendResponse(res, 200, true, "Tokens refreshed successfully", {
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error(`Refresh token error: ${(error as Error).message}`);
      sendResponse(res, 401, false, "Invalid refresh token");
    }
  },
);

/**
 * @desc    User logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = catchAsync(async (_req: Request<{}, {}, {}, {}>, res: Response) => {
  sendResponse(res, 200, true, "User logged out successfully");
});

/**
 * @desc    Get current user details
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response) => {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    sendResponse(res, 200, true, "User details fetched successfully", {
      user,
    });
  },
);
