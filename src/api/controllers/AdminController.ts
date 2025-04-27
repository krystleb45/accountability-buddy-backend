// src/api/controllers/AnalyticsController.ts
import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import Report from "../models/Report";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { PERMISSIONS } from "../../constants/roles";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";

// --------------------------
// User Management Methods
// --------------------------

/**
 * Get all users (Admin & Super Admin only).
 */
export const getAllUsers = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.MANAGE_USERS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }

    const users = await User.find().select("-password");
    if (!users.length) {
      throw createError("No users found", 404);
    }
    sendResponse(res, 200, true, "Users fetched successfully", { users });
  }
);

/**
 * Update user role (Super Admin only).
 */
interface UpdateUserRoleBody {
  userId: string;
  role: string;
}

export const updateUserRole = catchAsync(
  async (
    req: AdminAuthenticatedRequest<{}, any, UpdateUserRoleBody>,
    res: Response
  ): Promise<void> => {
    const { userId, role } = req.body;
    if (!userId || !role) {
      throw createError("User ID and role are required", 400);
    }

    const currentUser = req.user!;
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

    const currentUser = req.user!;
    if (!PERMISSIONS.MANAGE_USERS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can delete users.", 403);
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw createError("User not found", 404);
    }
    getGlobalAnalytics;
    sendResponse(res, 200, true, "User account deleted successfully");
  }
);

// --------------------------
// Analytics Methods
// --------------------------

/**
 * Dashboard overview analytics
 * GET /api/admin/analytics
 */
export const getDashboardAnalytics = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const totalUsers   = await User.countDocuments();
    const activeUsers  = await User.countDocuments({ active: true });
    const reportsCount = await Report.countDocuments();

    sendResponse(res, 200, true, "Dashboard analytics fetched successfully", {
      totalUsers,
      activeUsers,
      reports: reportsCount,
    });
  }
);

/**
 * Fetch user analytics
 * GET /api/admin/analytics/users
 */
export const getUserAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.VIEW_ANALYTICS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }

    // TODO: implement real user analytics logic here
    const analytics = {};
    sendResponse(res, 200, true, "User analytics fetched successfully", { analytics });
  }
);

/**
 * Fetch goal/post analytics
 * GET /api/admin/analytics/goals
 * GET /api/admin/analytics/posts
 */
export const getGlobalAnalytics = catchAsync(
  async (_req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: implement real goals/posts analytics logic here
    const data = {};
    sendResponse(res, 200, true, "Global analytics fetched successfully", { data });
  }
);

/**
 * Fetch financial analytics
 * GET /api/admin/analytics/financial
 */
export const getFinancialAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.EDIT_SETTINGS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can view financial analytics.", 403);
    }

    // TODO: implement real financial analytics logic here
    const analytics = {};
    sendResponse(res, 200, true, "Financial analytics fetched successfully", { analytics });
  }
);

/**
 * Fetch custom analytics based on date and metric
 * POST /api/admin/analytics/custom
 */
export const getCustomAnalytics = catchAsync(
  async (
    req: AdminAuthenticatedRequest<{}, any, { startDate: string; endDate: string; metric: string }>,
    res: Response
  ): Promise<void> => {
    // Destructure and prefix to avoid unused-var errors
    const { startDate: _startDate, endDate: _endDate, metric: _metric } = req.body;

    // (Optional) Log them so they're “used”
    console.debug("Custom analytics params:", { _startDate, _endDate, _metric });

    // TODO: replace with real analytics logic
    const analytics = {
      startDate: _startDate,
      endDate: _endDate,
      metric: _metric,
      value: 0,
    };

    sendResponse(res, 200, true, "Custom analytics fetched successfully", { analytics });
  }
);
