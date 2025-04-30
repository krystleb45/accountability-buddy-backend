// src/controllers/ProfileController.ts
import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import ProfileService from "../services/ProfileService";

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await ProfileService.getProfile(req.user!.id);
  sendResponse(res, 200, true, "Profile retrieved successfully", profile);
});

export const updateProfile = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  // 1) Check for validation errors from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendResponse(res, 400, false, "Validation error", { errors: errors.array() });
    return;
  }

  // 2) Build updates object
  const updates: Partial<{ username: string; email: string }> = {};
  if (typeof req.body.username === "string") {
    updates.username = req.body.username.trim();
  }
  if (typeof req.body.email === "string") {
    updates.email = req.body.email.trim();
  }
  if (Object.keys(updates).length === 0) {
    throw createError("No updatable fields provided", 400);
  }

  // 3) Delegate to service
  const updatedProfile = await ProfileService.updateProfile(req.user!.id, updates);
  sendResponse(res, 200, true, "Profile updated successfully", updatedProfile);
});
