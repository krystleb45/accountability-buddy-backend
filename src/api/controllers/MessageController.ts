import type { Request, Response } from "express";
import MessageService from "../services/MessageService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

// =====================================================
// EXISTING METHODS (Updated)
// =====================================================

export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { receiverId, message, recipientId, groupId, content, messageType } = req.body;
  const senderId = req.user!.id;

  // Support both old and new request formats
  const messageContent = content || message;
  const recipient = recipientId || receiverId;
  const type = messageType || "private"; // Changed from "direct" to "private"

  const newMsg = await MessageService.sendMessage(
    senderId,
    recipient,
    messageContent,
    type,
    groupId
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

// =====================================================
// NEW METHODS FOR ENHANCED MESSAGING
// =====================================================

/**
 * GET /api/messages/threads
 * Get all conversation threads for the authenticated user
 */
export const getMessageThreads = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { limit = 20, page = 1, messageType, search } = req.query;

  const threads = await MessageService.getMessageThreads(
    userId,
    {
      limit: parseInt(limit as string, 10),
      page: parseInt(page as string, 10),
      messageType: messageType as string,
      search: search as string,
    }
  );

  sendResponse(res, 200, true, "Message threads fetched successfully", threads);
});

/**
 * GET /api/messages/threads/:threadId/messages
 * Get messages in a specific thread
 */
export const getMessagesInThread = catchAsync(
  async (req: Request<{ threadId: string }>, res: Response) => {
    const { threadId } = req.params;
    const userId = req.user!.id;
    const { limit = 50, page = 1, before } = req.query;

    const result = await MessageService.getMessagesInThread(
      threadId,
      userId,
      {
        limit: parseInt(limit as string, 10),
        page: parseInt(page as string, 10),
        before: before as string,
      }
    );

    sendResponse(res, 200, true, "Messages fetched successfully", result);
  }
);

/**
 * POST /api/messages/threads/:threadId/mark-read
 * Mark all messages in a thread as read
 */
export const markThreadAsRead = catchAsync(
  async (req: Request<{ threadId: string }>, res: Response) => {
    const { threadId } = req.params;
    const userId = req.user!.id;

    const count = await MessageService.markThreadAsRead(threadId, userId);

    sendResponse(res, 200, true, "Thread marked as read", {
      updatedMessages: count,
    });
  }
);

/**
 * GET /api/messages/recent
 * Get recent messages for dashboard
 */
export const getRecentMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { limit = 5 } = req.query;

  const messages = await MessageService.getRecentMessages(
    userId,
    parseInt(limit as string, 10)
  );

  sendResponse(res, 200, true, "Recent messages fetched successfully", messages);
});

/**
 * GET /api/messages/unread-count
 * Get unread message count for the authenticated user
 */
export const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const count = await MessageService.getUnreadCount(userId);

  sendResponse(res, 200, true, "Unread count fetched successfully", { count });
});

/**
 * GET /api/messages/stats
 * Get message statistics for the authenticated user
 */
export const getMessageStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const stats = await MessageService.getMessageStats(userId);

  sendResponse(res, 200, true, "Message stats fetched successfully", stats);
});

/**
 * GET /api/messages/:messageId
 * Get a specific message by ID
 */
export const getMessageById = catchAsync(
  async (req: Request<{ messageId: string }>, res: Response) => {
    const { messageId } = req.params;
    const userId = req.user!.id;

    const message = await MessageService.getMessageById(messageId, userId);

    sendResponse(res, 200, true, "Message fetched successfully", message);
  }
);

/**
 * PUT /api/messages/:messageId
 * Edit a message
 */
export const editMessage = catchAsync(
  async (req: Request<{ messageId: string }>, res: Response) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    const updatedMessage = await MessageService.editMessage(messageId, userId, content);

    sendResponse(res, 200, true, "Message edited successfully", updatedMessage);
  }
);

/**
 * POST /api/messages/:messageId/reactions
 * Add a reaction to a message
 */
export const addReaction = catchAsync(
  async (req: Request<{ messageId: string }>, res: Response) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user!.id;

    const updatedMessage = await MessageService.addReaction(messageId, userId, emoji);

    sendResponse(res, 200, true, "Reaction added successfully", updatedMessage);
  }
);

/**
 * DELETE /api/messages/:messageId/reactions/:emoji
 * Remove a reaction from a message
 */
export const removeReaction = catchAsync(
  async (req: Request<{ messageId: string; emoji: string }>, res: Response) => {
    const { messageId, emoji } = req.params;
    const userId = req.user!.id;

    const updatedMessage = await MessageService.removeReaction(messageId, userId, emoji);

    sendResponse(res, 200, true, "Reaction removed successfully", updatedMessage);
  }
);

/**
 * POST /api/messages/mark-read
 * Mark multiple messages as read
 */
export const markMultipleMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
  const { messageIds } = req.body;
  const userId = req.user!.id;

  const count = await MessageService.markMultipleMessagesAsRead(messageIds, userId);

  sendResponse(res, 200, true, "Messages marked as read", {
    updatedMessages: count,
  });
});

/**
 * GET /api/messages/search
 * Search messages
 */
export const searchMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { search, messageType, recipientId, groupId, limit = 20 } = req.query;

  const messages = await MessageService.searchMessages(
    userId,
    search as string,
    {
      messageType: messageType as string,
      recipientId: recipientId as string,
      groupId: groupId as string,
      limit: parseInt(limit as string, 10),
    }
  );

  sendResponse(res, 200, true, "Messages searched successfully", messages);
});
