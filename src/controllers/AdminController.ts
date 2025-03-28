import type { Response, NextFunction } from "express";
import { User } from "../api/models/User";
import catchAsync from "../api/utils/catchAsync";
import sendResponse from "../api/utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { PERMISSIONS } from "../constants/roles";
import type { AuthenticatedRequest } from "../types/AuthenticatedRequest"; // ✅ Import AuthenticatedRequest

/**
 * Middleware to check if the current user has the required permissions.
 */
export const checkAccess =
  (allowedRoles: string[]) =>
    (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
      try {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
          return next(createError("Access denied. Insufficient privileges.", 403));
        }
        next();
      } catch (error) {
        next(error);
      }
    };

/**
 * Get all users (Admin & Super Admin only).
 */
export const getAllUsers = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !PERMISSIONS.MANAGE_USERS.includes(req.user.role)) {
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
 * Type definition for updating user roles
 */
interface UpdateUserRoleBody {
  userId: string;
  role: string;
}

/**
 * Update user role (Super Admin only).
 */
export const updateUserRole = catchAsync(
  async (req: AuthenticatedRequest<{}, {}, UpdateUserRoleBody>, res: Response): Promise<void> => {
    const { userId, role } = req.body;

    if (!userId || !role) {
      throw createError("User ID and role are required", 400);
    }

    if (!req.user || !PERMISSIONS.EDIT_SETTINGS.includes(req.user.role)) {
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

    sendResponse(res, 200, true, "User role updated successfully", {
      user: updatedUser,
    });
  }
);

/**
 * Delete user account (Super Admin only).
 */
export const deleteUserAccount = catchAsync(
  async (req: AuthenticatedRequest<{ userId: string }>, res: Response): Promise<void> => {
    const { userId } = req.params;

    if (!userId) {
      throw createError("User ID is required", 400);
    }

    if (!req.user || !PERMISSIONS.MANAGE_USERS.includes(req.user.role)) {
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user || !PERMISSIONS.VIEW_ANALYTICS.includes(req.user.role)) {
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user || !PERMISSIONS.EDIT_SETTINGS.includes(req.user.role)) {
      throw createError("Access denied. Only Super Admins can view financial analytics.", 403);
    }

    const analytics = {}; // Replace with actual analytics data
    sendResponse(res, 200, true, "Financial analytics fetched successfully", { analytics });
  }
);
