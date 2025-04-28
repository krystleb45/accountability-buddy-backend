// src/api/controllers/AdminController.ts
import type { Request, Response, NextFunction } from "express";
import { PERMISSIONS } from "../../constants/roles";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AdminService from "../services/AdminService";

// --------------------------
// User Management Methods
// --------------------------

export const getAllUsers = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.MANAGE_USERS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }

    const users = await AdminService.fetchAllUsers();
    if (!users.length) {
      throw createError("No users found", 404);
    }

    sendResponse(res, 200, true, "Users fetched successfully", { users });
  }
);

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

    const updatedUser = await AdminService.changeUserRole(userId, role);
    if (!updatedUser) {
      throw createError("User not found", 404);
    }

    sendResponse(res, 200, true, "User role updated successfully", { user: updatedUser });
  }
);

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

    const deletedUser = await AdminService.removeUser(userId);
    if (!deletedUser) {
      throw createError("User not found", 404);
    }

    sendResponse(res, 200, true, "User account deleted successfully");
  }
);

// --------------------------
// Dashboard Analytics
// --------------------------

export const getDashboardAnalytics = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const totals = await AdminService.dashboardTotals();
    sendResponse(res, 200, true, "Dashboard analytics fetched successfully", totals);
  }
);
