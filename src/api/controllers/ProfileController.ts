// src/controllers/ProfileController.ts
import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * @desc    Get current user's profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      // Won't actually hit next because your router pre-checks, but safe guard:
      throw createError("Unauthorized", 401);
    }

    // Select only the fields you expose
    const user = await User.findById(userId)
      .select("name email bio interests profileImage coverImage")
      .lean();
    if (!user) {
      throw createError("User not found", 404);
    }

    sendResponse(res, 200, true, "Profile retrieved successfully", user);
  }
);

/**
 * @desc    Update current user's profile (name and/or email)
 * @route   PUT /api/profile/update
 * @access  Private
 */
export const updateProfile = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw createError("Unauthorized", 401);
    }

    // Re-check validation result from your route
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, 400, false, "Validation error", {
        errors: errors.array(),
      });
      return;  // <-- explicit void-return
    }

    // Build update object only for provided fields
    const updates: Partial<{ name: string; email: string }> = {};
    if (typeof req.body.name === "string") {
      updates.name = req.body.name.trim();
    }
    if (typeof req.body.email === "string") {
      updates.email = req.body.email.trim();
    }

    if (Object.keys(updates).length === 0) {
      throw createError("No updatable fields provided", 400);
    }

    const updated = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("name email bio interests profileImage coverImage");

    if (!updated) {
      throw createError("User not found", 404);
    }

    sendResponse(res, 200, true, "Profile updated successfully", updated);
    return;  // <-- explicit void-return
  }
);
