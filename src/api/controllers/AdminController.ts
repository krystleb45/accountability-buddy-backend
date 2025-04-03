import { Response, NextFunction } from "express";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { PERMISSIONS } from "../../constants/roles";
import type { AdminAuthenticatedRequest } from "../types/AdminAuthenticatedRequest";

/**
 * Middleware to check if the current user has the required permissions.
 */
export const checkAccess =
  (allowedRoles: string[]) =>
    (req: AdminAuthenticatedRequest, _res: Response, next: NextFunction): void => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return next(createError("Access denied. Insufficient privileges.", 403));
      }
      next();
    };

/**
 * Get all users (Admin & Super Admin only).
 */
export const getAllUsers = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user; // already full IUser
    if (!PERMISSIONS.MANAGE_USERS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }

    const users = await User.find().select("-password");
    if (!users || users.length === 0) {
      throw createError("No users found", 404);
    }
    res.json(users);
  }
);

/**
 * Type definition for updating user roles.
 */
interface UpdateUserRoleBody {
  userId: string;
  role: string;
}

/**
 * Update user role (Super Admin only).
 */
export const updateUserRole = catchAsync(
  async (
    req: AdminAuthenticatedRequest<{}, any, UpdateUserRoleBody>,
    res: Response
  ): Promise<void> => {
    const { userId, role } = req.body;
    if (!userId || !role) {
      throw createError("User ID and role are required", 400);
    }
    const currentUser = req.user;
    if (!PERMISSIONS.EDIT_SETTINGS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can edit roles.", 403);
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("-password");
    if (!updatedUser) {
      throw createError("User not found", 404);
    }
    sendResponse(res, 200, true, "User role updated successfully", { user: updatedUser });
  }
);

/**
 * Delete user account (Super Admin only).
 */
export const deleteUserAccount = catchAsync(
  async (
    req: AdminAuthenticatedRequest<{ userId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { userId } = req.params;
    if (!userId) {
      throw createError("User ID is required", 400);
    }
    const currentUser = req.user;
    if (!PERMISSIONS.MANAGE_USERS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can delete users.", 403);
    }
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw createError("User not found", 404);
    }
    sendResponse(res, 200, true, "User account deleted successfully");
  }
);

/**
 * Get user-related analytics (Admin, Super Admin, and Moderator).
 */
export const getUserAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user;
    if (!PERMISSIONS.VIEW_ANALYTICS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }
    const analytics = {}; // Replace with actual analytics data
    sendResponse(res, 200, true, "User analytics fetched successfully", { analytics });
  }
);

/**
 * Get financial-related analytics (Super Admin only).
 */
export const getFinancialAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user;
    if (!PERMISSIONS.EDIT_SETTINGS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can view financial analytics.", 403);
    }
    const analytics = {}; // Replace with actual analytics data
    sendResponse(res, 200, true, "Financial analytics fetched successfully", { analytics });
  }
);

export default {
  checkAccess,
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
  getUserAnalytics,
  getFinancialAnalytics,
};
