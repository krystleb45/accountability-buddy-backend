import type { Request, Response } from "express";
import MessageService from "../services/MessageService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { receiverId, message } = req.body;
  const senderId = req.user!.id;

  const newMsg = await MessageService.sendMessage(
    senderId,
    receiverId,
    message
  );
  sendResponse(res, 201, true, "Message sent successfully", { message: newMsg });
});

export const getMessagesWithUser = catchAsync(
  async (req: Request<{ userId: string }>, res: Response) => {
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = parseInt(req.query.limit as string || "20", 10);
    const userId = req.user!.id;

    const { messages, pagination } =
      await MessageService.getMessagesWithUser(userId, otherUserId, page, limit);

    sendResponse(res, 200, true, "Messages fetched successfully", {
      messages,
      pagination,
    });
  }
);

export const deleteMessage = catchAsync(
  async (req: Request<{ messageId: string }>, res: Response) => {
    const { messageId } = req.params;
    const userId = req.user!.id;

    await MessageService.deleteMessage(messageId, userId);
    sendResponse(res, 200, true, "Message deleted successfully");
  }
);

export const markMessagesAsRead = catchAsync(
  async (req: Request<{ userId: string }>, res: Response) => {
    const otherUserId = req.params.userId;
    const userId = req.user!.id;

    const count = await MessageService.markMessagesAsRead(
      otherUserId,
      userId
    );
    sendResponse(res, 200, true, "Messages marked as read", {
      updatedMessages: count,
    });
  }
);
