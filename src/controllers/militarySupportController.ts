import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync"; // Centralized async error handling
import sendResponse from "../utils/sendResponse"; // Standardized API responses

import { createError } from "../middleware/errorHandler"; // Custom error handler
import Resource from "../models/MilitaryResource"; // Military resources model

/**
 * @desc    Get resources for military support
 * @route   GET /api/military-support/resources
 * @access  Public
 */
export const getResources = catchAsync(
  async (
    _req: Request<{}, {}, {}, {}>, // Explicitly define request types
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Fetch resources from the database
      const resources = await Resource.find().sort({ createdAt: -1 });
  
      if (!resources || resources.length === 0) {
        throw createError("No resources found", 404); // Error handling
      }
  
      // Send response asynchronously
      await sendResponse(res, 200, true, "Resources fetched successfully", { resources });
    } catch (error) {
      next(error); // Forward error to middleware
    }
  },
);
  

/**
 * @desc    Get the disclaimer
 * @route   GET /api/military-support/disclaimer
 * @access  Public
 */
export const getDisclaimer = catchAsync(
  async (
    _req: Request<{}, {}, {}, {}>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {const disclaimerText =
          "Disclaimer: The information provided in this platform is for support purposes only and does not replace professional medical, legal, or mental health advice. If you are in crisis, please contact emergency services or a licensed professional immediately.";
  
    await sendResponse(res, 200, true, "Disclaimer fetched successfully", {
      disclaimer: disclaimerText,
    });
    } catch (error) {
      next(error); // Forward error
    }
  },
);
  

/**
 * @desc    Send a chatroom message
 * @route   POST /api/military-support/chat/send
 * @access  Private (Military Auth Required)
 */
export const sendMessage = catchAsync(
  async (
    req: Request<{}, {}, { text: string }, {}>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { text } = req.body;
      const userId = req.user?.id;
  
      if (!text || text.trim() === "") {
        throw createError("Message text is required", 400);
      }
  
      const message = await Resource.create({
        user: userId,
        text,
        timestamp: new Date(),
      });
  
      await sendResponse(res, 201, true, "Message sent successfully", { message });
    } catch (error) {
      next(error); // Forward error
    }
  },
);
  
