import { Request, Response, NextFunction } from "express"; 
import mongoose, { ObjectId } from "mongoose";
import Chat from "../models/Chat";
import Message, { IMessage } from "../models/Message";
import Notification from "../models/Notification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { encryptMessage, decryptMessage } from "../../utils/encryption"; // Encryption utils
import { logger } from "../../utils/winstonLogger"; // Logger

/**
 * @desc Retrieve message history from a specific chat room with pagination
 * @route GET /chat/:chatId/messages
 * @access Private
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

    const query = req.query as { [key: string]: string };
    const limit = parseInt(query.limit ?? "10", 10);
    const page = parseInt(query.page ?? "1", 10);
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required.");
      return;
    }

    const chat = await Chat.findById(chatId).populate("messages");
    if (!chat) {
      sendResponse(res, 404, false, "Chat not found.");
      return;
    }

    const skip = (page - 1) * limit;
    const messages = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const encryptionKey = process.env.ENCRYPTION_KEY as string;
    const decryptedMessages = messages.map((msg) => ({
      ...msg.toObject(),
      _id: msg._id as ObjectId,
      text: msg.text ? decryptMessage(msg.text, Buffer.from(encryptionKey, "base64")) : "",
    }));

    const totalMessages = await Message.countDocuments({ chatId });
    const totalPages = Math.ceil(totalMessages / limit);

    sendResponse(res, 200, true, "Chat message history fetched successfully.", {
      messages: decryptedMessages,
      pagination: { totalMessages, currentPage: page, totalPages },
    });

    logger.info(`Messages fetched for chat: ${chatId}, user: ${userId}`);
  }
);

/**
 * @desc Send a private message to a friend
 * @route POST /chat/private/:friendId
 * @access Private
 */
export const sendPrivateMessage = catchAsync(
  async (
    req: Request<{ friendId: string }, any, { message: string }, {}>,
    res: Response
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest<{ friendId: string }, any, { message: string }, {}>;
    const { friendId } = authReq.params;
    const { message } = authReq.body;
    const senderId = authReq.user?.id;

    if (!friendId || !senderId || !message.trim()) {
      sendResponse(res, 400, false, "Friend ID, sender ID, and message are required.");
      return;
    }

    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const receiverObjectId = new mongoose.Types.ObjectId(friendId);

    let chat = await Chat.findOne({
      participants: { $all: [senderObjectId, receiverObjectId] },
    });
    if (!chat) {
      chat = await Chat.create({
        participants: [senderObjectId, receiverObjectId],
        messages: [],
        chatType: "private",
      });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY as string;
    const encryptedMessage = encryptMessage(message, Buffer.from(encryptionKey, "base64"));

    const newMessage: IMessage = await Message.create({
      chatId: chat._id,
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      text: encryptedMessage,
      messageType: "private",
      timestamp: new Date(),
      status: "sent",
    });

    chat.messages.push(newMessage._id as mongoose.Types.ObjectId);
    await chat.save();

    await Notification.create({
      user: receiverObjectId,
      message: `New message from ${authReq.user?.email}`,
      type: "message",
      read: false,
      link: `/chat/private/${senderId}`,
    });

    sendResponse(res, 201, true, "Message sent successfully.", {
      chatId: chat._id.toString(),
      message: newMessage,
    });

    global.io.to(friendId).emit("newMessage", { chatId: chat._id.toString(), message: newMessage });
    logger.info(`User ${senderId} sent a private message to ${friendId}`);
  }
);

/**
 * @desc Edit a message
 * @route PUT /chat/message/:messageId
 * @access Private
 */
export const editMessage = catchAsync(
  async (
    req: Request<{ messageId: string }, any, { newText: string }, {}>,
    res: Response
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest<{ messageId: string }, any, { newText: string }, {}>;
    const { messageId } = authReq.params;
    const { newText } = authReq.body;
    const userId = authReq.user?.id;

    if (!newText.trim()) {
      sendResponse(res, 400, false, "Message cannot be empty.");
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      sendResponse(res, 404, false, "Message not found.");
      return;
    }

    if (message.senderId.toString() !== userId) {
      sendResponse(res, 403, false, "You can only edit your own messages.");
      return;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY as string;
    const encryptedMessage = encryptMessage(newText, Buffer.from(encryptionKey, "base64"));

    message.text = encryptedMessage;
    message.status = "edited";
    await message.save();

    sendResponse(res, 200, true, "Message edited successfully.");
    global.io.to(message.chatId.toString()).emit("messageEdited", { messageId, newText });
    logger.info(`User ${userId} edited a message with ID: ${messageId}`);
  }
);

/**
 * @desc Delete a message
 * @route DELETE /chat/message/:messageId
 * @access Private
 */
export const deleteMessage = catchAsync(
  async (
    req: Request<{ messageId: string }>,
    res: Response
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest<{ messageId: string }>;
    const { messageId } = authReq.params;
    const userId = authReq.user?.id;

    const message = await Message.findById(messageId);
    if (!message) {
      sendResponse(res, 404, false, "Message not found.");
      return;
    }

    if (message.senderId.toString() !== userId) {
      sendResponse(res, 403, false, "You can only delete your own messages.");
      return;
    }

    message.text = "This message has been deleted.";
    message.status = "deleted";
    await message.save();

    sendResponse(res, 200, true, "Message deleted successfully.");
    global.io.to(message.chatId.toString()).emit("messageDeleted", { messageId });
    logger.info(`User ${userId} deleted a message with ID: ${messageId}`);
  }
);

/**
 * @desc Mark messages as read
 * @route POST /chat/:chatId/read
 * @access Private
 */
export const markMessagesAsRead = catchAsync(
  async (
    req: Request<{ chatId: string }>,
    res: Response
  ): Promise<void> => {
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

    const unreadMessages = chat.unreadMessages.find(
      (entry) => entry.userId.toString() === userId
    );

    if (unreadMessages) {
      unreadMessages.count = 0;
      await chat.save();
    }

    sendResponse(res, 200, true, "Messages marked as read.");
    global.io.to(chatId).emit("messagesRead", { userId });
    logger.info(`User ${userId} marked messages as read in chat: ${chatId}`);
  }
);

/**
 * @desc Get private chat history between the logged-in user and a friend.
 * @route GET /chat/private/:friendId
 * @access Private
 */
export const getPrivateChats = catchAsync(
  async (
    req: Request<{ friendId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
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

    const senderObjectId = new mongoose.Types.ObjectId(userId);
    const receiverObjectId = new mongoose.Types.ObjectId(friendId);

    // Find the private chat between the two users
    const chat = await Chat.findOne({
      participants: { $all: [senderObjectId, receiverObjectId] },
      chatType: "private",
    });

    if (!chat) {
      sendResponse(res, 404, false, "Private chat not found.");
      return;
    }

    // Retrieve all messages in the chat sorted by timestamp ascending
    const messages = await Message.find({ chatId: chat._id }).sort({ timestamp: 1 });
    const encryptionKey = process.env.ENCRYPTION_KEY as string;
    const decryptedMessages = messages.map((msg) => ({
      ...msg.toObject(),
      text: msg.text ? decryptMessage(msg.text, Buffer.from(encryptionKey, "base64")) : "",
    }));

    sendResponse(res, 200, true, "Private chat history fetched successfully.", {
      chatId: chat._id,
      messages: decryptedMessages,
    });
    logger.info(`Private chat history fetched for chat between user ${userId} and friend ${friendId}`);
  }
);
