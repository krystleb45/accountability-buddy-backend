import type { Request, Response } from "express";
import mongoose from "mongoose";
import Chat from "../models/Chat";
import Message, { IMessage } from "../models/Message";
import Notification from "../models/Notification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * ✅ Define `AuthenticatedRequest` locally (no need to import it)
 */
type AuthenticatedRequest<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  Query = any
> = Request<P, ResBody, ReqBody, Query> & {
  user?: {
    email?: string;
    id: string;
    role: "user" | "admin" | "moderator";
  };
};

/**
 * @desc Retrieve message history from a specific chat room
 * @route GET /chat/:chatId/messages
 * @access Private
 */
export const getChatMessages = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string }>,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    sendResponse(res, 400, false, "User ID is required.");
    return;
  }

  const chat = await Chat.findById(chatId).populate("messages");

  if (!chat) {
    sendResponse(res, 404, false, "Chat not found.");
    return;
  }

  sendResponse(res, 200, true, "Chat message history fetched successfully.", {
    messages: chat.messages.map((msg: any) => ({
      ...msg.toObject(),
      _id: msg._id.toString(),
    })),
  });
});

/**
 * @desc Send a private message to a friend
 * @route POST /chat/private/:friendId
 * @access Private
 */
export const sendPrivateMessage = catchAsync(async (
  req: AuthenticatedRequest<{ friendId: string }, {}, { message: string }>,
  res: Response
): Promise<void> => {
  const { friendId } = req.params;
  const { message } = req.body;
  const senderId = req.user?.id;

  if (!friendId || !senderId || !message.trim()) {
    sendResponse(res, 400, false, "Friend ID, sender ID, and message are required.");
    return;
  }

  const senderObjectId = new mongoose.Types.ObjectId(senderId);
  const receiverObjectId = new mongoose.Types.ObjectId(friendId);

  let chat = await Chat.findOne({ participants: { $all: [senderObjectId, receiverObjectId] } });

  if (!chat) {
    chat = await Chat.create({
      participants: [senderObjectId, receiverObjectId],
      messages: [],
      chatType: "private",
    });
  }

  const newMessage: IMessage = await Message.create({
    chatId: chat._id,
    senderId: senderObjectId,
    receiverId: receiverObjectId,
    text: message,
    messageType: "private",
    timestamp: new Date(),
    status: "sent",
  });

  chat.messages.push(newMessage._id as mongoose.Types.ObjectId);
  await chat.save();

  await Notification.create({
    user: receiverObjectId,
    message: `New message from ${req.user?.email}`,
    type: "message",
    read: false,
    link: `/chat/private/${senderId}`,
  });

  sendResponse(res, 201, true, "Message sent successfully.", {
    chatId: chat._id.toString(),
    message: newMessage,
  });

  global.io.to(friendId).emit("newMessage", { chatId: chat._id.toString(), message: newMessage });
});

/**
 * @desc Edit a message
 * @route PUT /chat/message/:messageId
 * @access Private
 */
export const editMessage = catchAsync(async (
  req: AuthenticatedRequest<{ messageId: string }, {}, { newText: string }>,
  res: Response
): Promise<void> => {
  const { messageId } = req.params;
  const { newText } = req.body;
  const userId = req.user?.id;

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

  message.text = newText;
  message.status = "edited";
  await message.save();

  sendResponse(res, 200, true, "Message edited successfully.");
  global.io.to(message.chatId.toString()).emit("messageEdited", { messageId, newText });
});

/**
 * @desc Delete a message
 * @route DELETE /chat/message/:messageId
 * @access Private
 */
export const deleteMessage = catchAsync(async (
  req: AuthenticatedRequest<{ messageId: string }>,
  res: Response
): Promise<void> => {
  const { messageId } = req.params;
  const userId = req.user?.id;

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
});

/**
 * @desc Mark messages as read
 * @route POST /chat/:chatId/read
 * @access Private
 */
export const markMessagesAsRead = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string }, {}, {}>,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    sendResponse(res, 400, false, "User ID is required.");
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    sendResponse(res, 404, false, "Chat not found.");
    return;
  }

  // Update unread message count for the user
  const unreadMessages = chat.unreadMessages.find(
    (entry) => entry.userId.toString() === userId
  );

  if (unreadMessages) {
    unreadMessages.count = 0; // Mark all messages as read
    await chat.save();
  }

  sendResponse(res, 200, true, "Messages marked as read.");
  global.io.to(chatId).emit("messagesRead", { userId });
});

/**
 * @desc Add a reaction to a message
 * @route POST /chat/:chatId/message/:messageId/reaction
 * @access Private
 */
export const addMessageReaction = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string; messageId: string }, {}, { reaction: string }>,
  res: Response
): Promise<void> => {
  const { chatId, messageId } = req.params;
  const { reaction } = req.body;
  const userId = req.user?.id;

  if (!userId || !reaction) {
    sendResponse(res, 400, false, "User ID and reaction are required.");
    return;
  }

  const message = await Message.findById(messageId);
  if (!message) {
    sendResponse(res, 404, false, "Message not found.");
    return;
  }

  // Add the reaction to the message
  if (!message.reactions) {
    message.reactions = [];
  }

  message.reactions.push({ userId: new mongoose.Types.ObjectId(userId), emoji: reaction });
  sendResponse(res, 200, true, "Reaction added successfully.");
  global.io.to(chatId).emit("reactionAdded", { messageId, reaction, userId });
});
