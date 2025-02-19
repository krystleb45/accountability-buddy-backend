import type { Request, Response, NextFunction } from "express";
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * Middleware to check if the current user is an admin.
 */
export const checkAdminAccess = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return next(
        createError("Access denied. Admin privileges required.", 403),
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (Admin only).
 */
export const getAllUsers = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response) => {
    if (!req.user || req.user.role !== "admin") {
      throw createError("Access denied. Admin privileges required.", 403);
    }
  
    const users = await User.find().select("-password");
  
    if (!users || users.length === 0) {
      throw createError("No users found", 404);
    }
  
    res.json(users);
  },
);

/**
 * Update user role (Admin only).
 */
export const updateUserRole = catchAsync(
  async (req: Request<{}, {}, { userId: string; role: string }>, res: Response): Promise<void> => {
    const { userId, role } = req.body;

    if (!userId || !role) {
      throw createError("User ID and role are required", 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      throw createError("User not found", 404);
    }

    sendResponse(res, 200, true, "User role updated successfully", {
      user: updatedUser,
    });
  },
);

/**
 * Delete user account (Admin only).
 */
export const deleteUserAccount = catchAsync(
  async (
    req: Request<{ userId: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { userId } = req.params;

    if (!userId) {
      throw createError("User ID is required", 400);
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      throw createError("User not found", 404);
    }

    sendResponse(res, 200, true, "User account deleted successfully");
  },
);

/**
 * Get user-related analytics (Admin only).
 */
export const getUserAnalytics = catchAsync(
  async (_req: Request<{}, {}, {}, {}>, res: Response): Promise<void> => {
    const analytics = {}; // Replace with actual analytics data
    sendResponse(res, 200, true, "User analytics fetched successfully", {
      analytics,
    });
  },
);

/**
 * Get financial-related analytics (Admin only).
 */
export const getFinancialAnalytics = catchAsync(
  async (_req: Request<{}, {}, {}, {}>, res: Response): Promise<void> => {
    const analytics = {}; // Replace with actual analytics data
    sendResponse(res, 200, true, "Financial analytics fetched successfully", {
      analytics,
    });
  },
);
