// src/api/controllers/chatController.ts
import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import Chat, { IChat } from "../models/Chat";
import Message from "../models/Message";
import Notification from "../models/Notification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { encryptMessage, decryptMessage } from "../../utils/encryption";
import { logger } from "../../utils/winstonLogger";

/**
 * @desc    Retrieve message history from a specific chat room
 * @route   GET /chat/:chatId/messages
 */
export const getChatMessages = catchAsync(
  async (
    req: Request<{ chatId: string }, any, any, { limit?: string; page?: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest<
      { chatId: string },
      any,
      any,
      { limit?: string; page?: string }
    >;
    const { chatId } = authReq.params;
    const userId = authReq.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required.");
      return;
    }

    // Cast the result so TS knows _id is ObjectId
    const chat = (await Chat.findById(chatId).populate("messages").exec()) as
      | (IChat & mongoose.Document & { _id: Types.ObjectId })
      | null;
    if (!chat) {
      sendResponse(res, 404, false, "Chat not found.");
      return;
    }

    const limit = parseInt(req.query.limit || "10", 10);
    const page = parseInt(req.query.page || "1", 10);
    const skip = (page - 1) * limit;

    const msgs = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
    const decrypted = msgs.map((m) => ({
      ...m.toObject(),
      text: m.text ? decryptMessage(m.text, key) : "",
    }));

    const total = await Message.countDocuments({ chatId });
    const totalPages = Math.ceil(total / limit);

    sendResponse(res, 200, true, "Chat message history fetched successfully.", {
      messages: decrypted,
      pagination: { totalMessages: total, currentPage: page, totalPages },
    });

    logger.info(`Messages fetched for chat ${chat._id.toString()}, user ${userId}`);
  }
);

/**
 * @desc    Send a private message to a friend
 * @route   POST /chat/private/:friendId
 */
export const sendPrivateMessage = catchAsync(
  async (
    req: Request<{ friendId: string }, any, { message: string }, {}>,
    res: Response
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest<
      { friendId: string },
      any,
      { message: string },
      {}
    >;
    const { friendId } = authReq.params;
    const { message } = authReq.body;
    const senderId = authReq.user?.id;

    if (!friendId || !senderId || !message.trim()) {
      sendResponse(res, 400, false, "Friend ID, sender ID and message are required.");
      return;
    }

    const senderObj = new Types.ObjectId(senderId);
    const receiverObj = new Types.ObjectId(friendId);

    // Cast findOne so TS knows _id is ObjectId
    let chat = (await Chat.findOne({
      participants: { $all: [senderObj, receiverObj] },
      chatType: "private",
    }).exec()) as (IChat & mongoose.Document & { _id: Types.ObjectId }) | null;

    if (!chat) {
      chat = (await Chat.create({
        participants: [senderObj, receiverObj],
        messages: [],
        chatType: "private",
        unreadMessages: [],
      })) as IChat & mongoose.Document & { _id: Types.ObjectId };
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
    const encrypted = encryptMessage(message, key);

    const newMsg = await Message.create({
      chatId: chat._id,
      senderId: senderObj,
      receiverId: receiverObj,
      text: encrypted,
      messageType: "private",
      timestamp: new Date(),
      status: "sent",
    });

    chat.messages.push(newMsg._id as Types.ObjectId);
    await chat.save();

    await Notification.create({
      user: receiverObj,
      message: `New message from ${authReq.user?.email}`,
      type: "message",
      read: false,
      link: `/chat/private/${senderId}`,
    });

    sendResponse(res, 201, true, "Message sent successfully.", {
      chatId: chat._id.toString(),
      message: newMsg,
    });

    global.io.to(friendId).emit("newMessage", {
      chatId: chat._id.toString(),
      message: newMsg,
    });

    logger.info(`User ${senderId} ▶ ${friendId}: "${message}"`);
  }
);

/**
 * @desc    Edit a message
 * @route   PUT /chat/message/:messageId
 */
export const editMessage = catchAsync(
  async (
    req: Request<{ messageId: string }, any, { newText: string }, {}>,
    res: Response
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest<
      { messageId: string },
      any,
      { newText: string },
      {}
    >;
    const { messageId } = authReq.params;
    const { newText } = authReq.body;
    const userId = authReq.user?.id;

    if (!newText.trim()) {
      sendResponse(res, 400, false, "Message cannot be empty.");
      return;
    }

    const msg = await Message.findById(messageId);
    if (!msg) {
      sendResponse(res, 404, false, "Message not found.");
      return;
    }
    if (msg.senderId.toString() !== userId) {
      sendResponse(res, 403, false, "You can only edit your own messages.");
      return;
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
    msg.text = encryptMessage(newText, key);
    msg.status = "edited";
    await msg.save();

    sendResponse(res, 200, true, "Message edited successfully.");
    global.io.to(msg.chatId.toString()).emit("messageEdited", { messageId, newText });
    logger.info(`User ${userId} edited message ${messageId}`);
  }
);

/**
 * @desc    Delete a message
 * @route   DELETE /chat/message/:messageId
 */
export const deleteMessage = catchAsync(
  async (req: Request<{ messageId: string }>, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest<{ messageId: string }>;
    const { messageId } = authReq.params;
    const userId = authReq.user?.id;

    const msg = await Message.findById(messageId);
    if (!msg) {
      sendResponse(res, 404, false, "Message not found.");
      return;
    }
    if (msg.senderId.toString() !== userId) {
      sendResponse(res, 403, false, "You can only delete your own messages.");
      return;
    }

    msg.text = "This message has been deleted.";
    msg.status = "deleted";
    await msg.save();

    sendResponse(res, 200, true, "Message deleted successfully.");
    global.io.to(msg.chatId.toString()).emit("messageDeleted", { messageId });
    logger.info(`User ${userId} deleted message ${messageId}`);
  }
);

/**
 * @desc    Mark messages as read
 * @route   POST /chat/:chatId/read
 */
export const markMessagesAsRead = catchAsync(
  async (req: Request<{ chatId: string }>, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest<{ chatId: string }>;
    const { chatId } = authReq.params;
    const userId = authReq.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required.");
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      sendResponse(res, 404, false, "Chat not found.");
      return;
    }

    const entry = chat.unreadMessages.find((e) => e.userId.toString() === userId);
    if (entry) {
      entry.count = 0;
      await chat.save();
    }

    sendResponse(res, 200, true, "Messages marked as read.");
    global.io.to(chatId).emit("messagesRead", { userId });
    logger.info(`User ${userId} marked messages as read in chat ${chatId}`);
  }
);

/**
 * @desc    Get private chat history between two users
 * @route   GET /chat/private/:friendId
 */
export const getPrivateChats = catchAsync(
  async (req: Request<{ friendId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest<{ friendId: string }>;
    const { friendId } = authReq.params;
    const userId = authReq.user?.id;
    if (!friendId || !userId) {
      sendResponse(res, 400, false, "Friend ID and User ID are required.");
      return;
    }
    if (!mongoose.isValidObjectId(friendId)) {
      sendResponse(res, 400, false, "Invalid friend ID.");
      return;
    }

    const a = new Types.ObjectId(userId);
    const b = new Types.ObjectId(friendId);
    const chat = (await Chat.findOne({
      participants: { $all: [a, b] },
      chatType: "private",
    }).exec()) as (IChat & mongoose.Document & { _id: Types.ObjectId }) | null;

    if (!chat) {
      sendResponse(res, 404, false, "Private chat not found.");
      return;
    }

    const msgs = await Message.find({ chatId: chat._id }).sort({ timestamp: 1 });
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
    const decrypted = msgs.map((m) => ({
      ...m.toObject(),
      text: m.text ? decryptMessage(m.text, key) : "",
    }));

    sendResponse(res, 200, true, "Private chat history fetched successfully.", {
      chatId: chat._id.toString(),
      messages: decrypted,
    });
    logger.info(`Private chat history for ${userId} ↔ ${friendId}`);
  }
);

export default {
  getChatMessages,
  sendPrivateMessage,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  getPrivateChats,
};
