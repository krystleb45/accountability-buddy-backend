// src/api/controllers/MilitarySupportController.ts
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import MilitarySupportService from "../services/MilitarySupportService";

export const getResources = catchAsync(async (_req, res) => {
  const resources = await MilitarySupportService.listResources();
  sendResponse(res, 200, true, "Resources fetched successfully", { resources });
});

export const getDisclaimer = catchAsync(async (_req, res) => {
  const disclaimer = MilitarySupportService.getDisclaimer();
  sendResponse(res, 200, true, "Disclaimer fetched successfully", { disclaimer });
});

export const sendMessage = catchAsync(async (req, res, next) => {
  const { chatroomId, message } = req.body as { chatroomId: string; message: string };
  const userId = req.user!.id;
  if (!chatroomId || !message.trim()) {
    return next(createError("chatroomId and message text are required", 400));
  }
  const newMsg = await MilitarySupportService.sendMessage(chatroomId, userId, message.trim());
  sendResponse(res, 201, true, "Message sent successfully", { message: newMsg });
});

export const getChatrooms = catchAsync(async (_req, res) => {
  const chatrooms = await MilitarySupportService.listChatrooms();
  sendResponse(res, 200, true, "Chatrooms fetched successfully", { chatrooms });
});

export const createChatroom = catchAsync(async (req, res, next) => {
  const { name, description } = req.body as { name: string; description: string };
  const userId = req.user!.id;
  if (!name || !description) {
    return next(createError("Chatroom name and description are required", 400));
  }
  const newRoom = await MilitarySupportService.createChatroom(name, description, userId);
  sendResponse(res, 201, true, "Military chatroom created", { chatroom: newRoom });
});
