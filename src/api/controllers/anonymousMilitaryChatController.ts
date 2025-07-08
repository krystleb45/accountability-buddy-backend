// src/api/controllers/anonymousMilitaryChatController.ts

import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AnonymousMilitaryChatService from "../services/AnonymousMilitaryChatService";

interface AnonymousRequest extends Request {
  anonymousUser?: {
    sessionId: string;
    displayName: string;
    room: string;
    joinedAt: Date;
  };
}

export const getRooms = catchAsync(async (_req: Request, res: Response) => {
  const rooms = await AnonymousMilitaryChatService.getRooms();
  sendResponse(res, 200, true, "Military chat rooms retrieved", { rooms });
});

export const joinRoom = catchAsync(async (req: AnonymousRequest, res: Response) => {
  const { roomId } = req.params;
  const { anonymousUser } = req;

  if (!anonymousUser) {
    throw createError("Anonymous session required", 400);
  }

  const result = await AnonymousMilitaryChatService.joinRoom(
    roomId,
    anonymousUser.sessionId,
    anonymousUser.displayName
  );

  // Emit to WebSocket that user joined
  const app = req.app;
  const socketService = app.get("anonymousMilitarySocketService");
  if (socketService) {
    socketService.handleUserJoin(roomId, anonymousUser.displayName, result.memberCount);
  }

  sendResponse(res, 200, true, "Joined room successfully", {
    room: roomId,
    memberCount: result.memberCount
  });
});

export const leaveRoom = catchAsync(async (req: AnonymousRequest, res: Response) => {
  const { roomId } = req.params;
  const { anonymousUser } = req;

  if (!anonymousUser) {
    throw createError("Anonymous session required", 400);
  }

  await AnonymousMilitaryChatService.leaveRoom(anonymousUser.sessionId);

  // Get updated member count
  const memberCount = await AnonymousMilitaryChatService.getRoomMemberCount(roomId);

  // Emit to WebSocket that user left
  const app = req.app;
  const socketService = app.get("anonymousMilitarySocketService");
  if (socketService) {
    socketService.handleUserLeave(roomId, anonymousUser.displayName, memberCount);
  }

  sendResponse(res, 200, true, "Left room successfully");
});

export const getMessages = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const messages = await AnonymousMilitaryChatService.getMessages(roomId, limit);

  sendResponse(res, 200, true, "Messages retrieved", { messages });
});

export const sendMessage = catchAsync(async (req: AnonymousRequest, res: Response) => {
  const { roomId } = req.params;
  const { message } = req.body;
  const { anonymousUser } = req;

  if (!anonymousUser) {
    throw createError("Anonymous session required", 400);
  }

  const result = await AnonymousMilitaryChatService.sendMessage(
    roomId,
    anonymousUser.sessionId,
    anonymousUser.displayName,
    message
  );

  // Emit to WebSocket
  const app = req.app;
  const socketService = app.get("anonymousMilitarySocketService");
  if (socketService) {
    socketService.handleNewMessage(roomId, result.message);

    // If flagged content, also send crisis resources
    if (result.isFlagged) {
      socketService.handleCrisisDetection(roomId, anonymousUser.sessionId);
    }
  }

  sendResponse(res, 201, true, "Message sent", {
    messageId: result.messageId,
    isFlagged: result.isFlagged
  });
});

export const getRoomMemberCount = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  const memberCount = await AnonymousMilitaryChatService.getRoomMemberCount(roomId);

  sendResponse(res, 200, true, "Member count retrieved", { memberCount });
});
