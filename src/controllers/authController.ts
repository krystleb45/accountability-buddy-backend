import type { Request, Response, NextFunction } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../api/models/User";
import catchAsync from "../api/utils/catchAsync";
import sendResponse from "../api/utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { logger } from "../utils/winstonLogger";

/**
 * ✅ Generate access and refresh tokens securely
 */
const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const accessTokenSecret: Secret = process.env.ACCESS_TOKEN_SECRET as Secret;
  const refreshTokenSecret: Secret = process.env.REFRESH_TOKEN_SECRET as Secret;

  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error("JWT secrets are missing. Check your environment variables.");
  }

  const accessToken = jwt.sign(
    { id: userId },
    accessTokenSecret,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m" } as SignOptions
  );
  
  const refreshToken = jwt.sign(
    { id: userId },
    refreshTokenSecret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d" } as SignOptions
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
    req: Request<{}, {}, { email: string; password: string; username: string }>, 
    res: Response
  ) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      throw createError("All fields are required", 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendResponse(res, 400, false, "User already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS ?? "12", 10)
    );

    const newUser = new User({ email, password: hashedPassword, username });
    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser._id.toString());

    sendResponse(res, 201, true, "User registered successfully", {
      accessToken,
      refreshToken,
    });
  }
);

/**
 * @desc    User login
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = catchAsync(
  async (
    req: Request<{}, {}, { email: string; password: string }>, 
    res: Response,
    next: NextFunction
  ) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError("Email and password are required", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(createError("Invalid credentials", 400));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createError("Invalid credentials", 400));
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    sendResponse(res, 200, true, "User logged in successfully", {
      accessToken,
      refreshToken,
    });
  }
);

/**
 * @desc    Refresh authentication tokens
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = catchAsync(
  async (
    req: Request<{}, {}, { refreshToken: string }>, 
    res: Response
  ) => {
    const { refreshToken: token } = req.body;

    if (!token) {
      sendResponse(res, 401, false, "Refresh token is required");
      return;
    }

    try {
      const refreshTokenSecret: Secret = process.env.REFRESH_TOKEN_SECRET as Secret;
      if (!refreshTokenSecret) {
        throw new Error("Missing REFRESH_TOKEN_SECRET in environment variables.");
      }

      const decoded = jwt.verify(token, refreshTokenSecret) as { id: string };

      const user = await User.findById(decoded.id);
      if (!user) {
        sendResponse(res, 401, false, "Invalid refresh token");
        return;
      }

      const { accessToken, refreshToken } = generateTokens(user._id.toString());

      sendResponse(res, 200, true, "Tokens refreshed successfully", {
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error(`Refresh token error: ${(error as Error).message}`);
      sendResponse(res, 401, false, "Invalid refresh token");
    }
  }
);

/**
 * @desc    User logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, 200, true, "User logged out successfully");
});

/**
 * @desc    Get current user details
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = catchAsync(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    sendResponse(res, 200, true, "User details fetched successfully", {
      user,
    });
  }
);
