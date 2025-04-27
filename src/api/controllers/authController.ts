// src/api/controllers/authController.ts
import type { Request, Response, NextFunction } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";

/** Generate access & refresh tokens */
const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const accessTokenSecret   = process.env.ACCESS_TOKEN_SECRET as Secret;
  const refreshTokenSecret  = process.env.REFRESH_TOKEN_SECRET as Secret;
  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error("JWT secrets are missing.");
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
 */
export const register = catchAsync(
  async (
    req: Request<{}, {}, { email: string; password: string; username: string }>,
    res: Response
  ): Promise<void> => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      sendResponse(res, 400, false, "All fields are required");
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendResponse(res, 400, false, "User already exists");
      return;
    }

    const newUser = new User({ email, password, username });
    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser._id.toString());

    sendResponse(
      res,
      201,
      true,
      "User registered successfully",
      { accessToken, refreshToken }
    );
    // no return value
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
  ) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(createError("Email and password are required", 400));
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(createError("Invalid credentials", 400));
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    sendResponse(res, 200, true, "Login successful", {
      id: user._id.toString(),
      name: user.username,
      email: user.email,
      role: user.role,
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
    res: Response
  ): Promise<void> => {
    const { refreshToken: token } = req.body;
    if (!token) {
      sendResponse(res, 401, false, "Refresh token is required");
      return;
    }

    try {
      const refreshTokenSecret: Secret =
        process.env.REFRESH_TOKEN_SECRET as Secret;
      const decoded = jwt.verify(token, refreshTokenSecret) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user) {
        sendResponse(res, 401, false, "Invalid refresh token");
        return;
      }

      const { accessToken, refreshToken } = generateTokens(user._id.toString());

      sendResponse(
        res,
        200,
        true,
        "Tokens refreshed successfully",
        { accessToken, refreshToken }
      );
      return;
    } catch (err) {
      logger.error(`Refresh token error: ${(err as Error).message}`);
      sendResponse(res, 401, false, "Invalid refresh token");
      return;
    }
  }
);


/**
 * @desc    Log the user out
 * @route   POST /api/auth/logout
 */
export const logout = catchAsync(async (_req: Request, res: Response) => {
  // If you store refresh tokens, revoke it here.
  sendResponse(res, 200, true, "Logged out successfully");
});

/**
 * @desc    Get current user's profile
 * @route   GET /api/auth/me
 */
export const getCurrentUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id).select("-password");
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }

  sendResponse(res, 200, true, "User details fetched successfully", { user });
  // no return value, so the Promise resolves to void
});

