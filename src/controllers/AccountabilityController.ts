import type { Request, Response, NextFunction } from "express";
import Achievement from "../models/Achievement";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

// Custom input sanitization function
const sanitizeInput = (input: any): any => {
  if (typeof input === "string") {
    return input.replace(/[^\w\s.@-]/g, "");
  }
  if (typeof input === "object" && input !== null) {
    const sanitized: Record<string, any> = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

/**
 * @desc    Get all achievements
 * @route   GET /api/achievements
 * @access  Public
 */
export const getAllAchievements = catchAsync(async (
  _req: Request<Record<string, any>, any, any, Record<string, any>>, 
  res: Response, 
  _next: NextFunction,
): Promise<void> => {
  const achievements = await Achievement.find();
  sendResponse(res, 200, true, "Achievements fetched successfully", { achievements });
});

/**
 * @desc    Get a single achievement by ID
 * @route   GET /api/achievements/:id
 * @access  Public
 */
export const getAchievementById = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>>, 
  res: Response, 
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const achievement = await Achievement.findById(id);

  if (!achievement) {
    return next(createError("Achievement not found", 404));
  }

  sendResponse(res, 200, true, "Achievement found", { achievement });
});

/**
 * @desc    Create a new achievement
 * @route   POST /api/achievements
 * @access  Private
 */
export const createAchievement = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>>, 
  res: Response, 
  next: NextFunction,
): Promise<void> => {
  const sanitizedData = sanitizeInput(req.body);
  const { name, description } = sanitizedData;

  if (!name || !description) {
    return next(createError("Name and description are required", 400));
  }

  const newAchievement = await Achievement.create({ name, description });
  sendResponse(res, 201, true, "Achievement created successfully", { achievement: newAchievement });
});

/**
 * @desc    Update an existing achievement by ID
 * @route   PUT /api/achievements/:id
 * @access  Private
 */
export const updateAchievement = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>>, 
  res: Response, 
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const sanitizedData = sanitizeInput(req.body);

  const updatedAchievement = await Achievement.findByIdAndUpdate(id, sanitizedData, { new: true });

  if (!updatedAchievement) {
    return next(createError("Achievement not found", 404));
  }

  sendResponse(res, 200, true, "Achievement updated successfully", { achievement: updatedAchievement });
});

/**
 * @desc    Delete an achievement by ID
 * @route   DELETE /api/achievements/:id
 * @access  Private
 */
export const deleteAchievement = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>>, 
  res: Response, 
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const achievement = await Achievement.findByIdAndDelete(id);

  if (!achievement) {
    return next(createError("Achievement not found", 404));
  }

  sendResponse(res, 200, true, "Achievement deleted successfully");
});

export default {
  getAllAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement,
};
