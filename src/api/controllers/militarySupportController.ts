import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

import Resource from "../models/MilitaryResource";
import Message from "../models/MilitaryMessage"; // Optional if separate message model is used
import MilitarySupportChatroom from "../models/MilitarySupportChatroom"; // Needed for chatroom features

/**
 * @desc    Fetch all military support resources (external links, hotlines)
 * @route   GET /api/military-support/resources
 * @access  Public
 */
export const getResources = catchAsync(async (_req, res, next) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });

    if (!resources || resources.length === 0) {
      throw createError("No military resources found", 404);
    }

    sendResponse(res, 200, true, "Resources fetched successfully", { resources });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get military support disclaimer text
 * @route   GET /api/military-support/disclaimer
 * @access  Public
 */
export const getDisclaimer = catchAsync(async (_req, res, next) => {
  try {
    const disclaimerText = `
      Disclaimer: The information provided in this platform is for support purposes only 
      and does not replace professional medical, legal, or mental health advice. 
      If you are in crisis, please contact emergency services or a licensed professional immediately.
    `;

    sendResponse(res, 200, true, "Disclaimer fetched successfully", { disclaimer: disclaimerText.trim() });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Send a message in a military chatroom
 * @route   POST /api/military-support/chat/send
 * @access  Private (Military Only)
 */
export const sendMessage = catchAsync(async (req, res, next) => {
  try {
    const { chatId, text } = req.body;
    const userId = req.user?.id;

    if (!chatId || !text || text.trim() === "") {
      throw createError("Chat ID and message text are required", 400);
    }

    const message = await Message.create({
      user: userId,
      text,
      timestamp: new Date(),
    });

    sendResponse(res, 201, true, "Message sent successfully", { message });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get all military support chatrooms
 * @route   GET /api/military-support/chatrooms
 * @access  Public (or Military Only)
 */
export const getChatrooms = catchAsync(async (_req, res, next) => {
  try {
    const rooms = await MilitarySupportChatroom.find().sort({ createdAt: -1 });

    if (!rooms || rooms.length === 0) {
      throw createError("No military chatrooms found", 404);
    }

    sendResponse(res, 200, true, "Chatrooms fetched successfully", { chatrooms: rooms });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Create a new military support chatroom
 * @route   POST /api/military-support/chatrooms
 * @access  Private (Military Only)
 */
export const createChatroom = catchAsync(async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!name || !description) {
      throw createError("Chatroom name and description are required", 400);
    }

    const existing = await MilitarySupportChatroom.findOne({ name });
    if (existing) {
      throw createError("A chatroom with this name already exists", 409);
    }

    const newRoom = await MilitarySupportChatroom.create({
      name,
      description,
      members: [userId],
    });

    sendResponse(res, 201, true, "Military chatroom created", { chatroom: newRoom });
  } catch (error) {
    next(error);
  }
});
