// src/controllers/ProfileController.ts
import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import ProfileService from "../services/ProfileService";

/**
 * GET /api/profile
 */
export const getProfile = catchAsync(
  async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const profile = await ProfileService.getProfile(req.user!.id);
    sendResponse(res, 200, true, "Profile retrieved successfully", profile);
  }
);

/**
 * PUT /api/profile
 */
export const updateProfile = catchAsync(
  async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    // 1) express-validator errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, 400, false, "Validation error", { errors: errors.array() });
      return;
    }

    // 2) collect only the fields we allow
    type ProfileUpdateFields = "username" | "email" | "bio" | "interests";
    const updates: Partial<Record<ProfileUpdateFields, unknown>> = {};

    if (typeof req.body.username === "string") {
      updates.username = req.body.username.trim();
    }
    if (typeof req.body.email === "string") {
      updates.email = req.body.email.trim();
    }
    if (typeof req.body.bio === "string") {
      updates.bio = req.body.bio.trim();
    }
    if (Array.isArray(req.body.interests)) {
      updates.interests = req.body.interests;
    }

    if (Object.keys(updates).length === 0) {
      throw createError("No updatable fields provided", 400);
    }

    // 3) delegate to service
    const updated = await ProfileService.updateProfile(req.user!.id, updates as any);
    sendResponse(res, 200, true, "Profile updated successfully", updated);
  }
);

/**
 * PUT /api/profile/image
 * multipart/form-data with field name "profileImage"
 */
export const uploadProfileImage = catchAsync(
  async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    if (!req.file) {
      throw createError("No file (profileImage) uploaded", 400);
    }

    const updated = await ProfileService.uploadProfileImage(req.user!.id, req.file);
    sendResponse(res, 200, true, "Avatar updated successfully", updated);
  }
);

/**
 * PUT /api/profile/cover
 * multipart/form-data with field name "coverImage"
 */
export const uploadCoverImage = catchAsync(
  async (
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    if (!req.file) {
      throw createError("No file (coverImage) uploaded", 400);
    }

    const updated = await ProfileService.uploadCoverImage(req.user!.id, req.file);
    sendResponse(res, 200, true, "Cover image updated successfully", updated);
  }
);
