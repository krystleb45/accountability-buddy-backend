import type { Request as _Request, Response, NextFunction as _NextFunction } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import Chat from "../models/Chat";
import Message from "../models/Message";
import Notification from "../models/Notification"; // ✅ Import Notification model
import sendResponse from "../utils/sendResponse";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";

// Type Definitions
type MarkAsReadResponse = { chatId: string; userId: string; status: string };
type AddReactionResponse = { messageId: string; reaction: string; status: string };

/**
 * @desc    Send a private message to a friend
 * @route   POST /chat/private/:friendId
 * @access  Private
 */
export const sendPrivateMessage = catchAsync(
  async (
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

    const newMessage = await Message.create({
      chatId: chat._id,
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      text: message,
      messageType: "private",
      timestamp: new Date(),
      readBy: [],
      reactions: [],
    });

    chat.messages.push(newMessage._id as mongoose.Types.ObjectId);
    await chat.save();

    // ✅ Create a notification for the recipient
    await Notification.create({
      user: receiverObjectId,
      message: `New message from ${senderId}`,
      type: "message",
      read: false,
      link: `/chat/private/${senderId}`, // ✅ Link to the chat
    });

    sendResponse(res, 201, true, "Message sent successfully.", {
      chatId: chat._id.toHexString(),
      message: {
        ...newMessage.toObject(),
        _id: (newMessage._id as mongoose.Types.ObjectId).toHexString(),
      },
    });

    // Emit socket event for real-time notifications
    global.io.to(friendId).emit("newMessage", { chatId: chat._id.toHexString(), message: newMessage });
  }
);

/**
 * @desc    Mark messages as read
 * @route   POST /chat/:chatId/read
 * @access  Private
 */
export const markMessagesAsRead = catchAsync(
  async (
    req: AuthenticatedRequest<{ chatId: string }>,
    res: Response<MarkAsReadResponse>
  ): Promise<void> => {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      sendResponse(res, 400, false, "Invalid chat ID");
      return;
    }

    await Message.updateMany(
      { chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    // ✅ Send notification for read messages
    await Notification.create({
      user: new mongoose.Types.ObjectId(userId),
      message: "Your messages have been read.",
      type: "info",
      read: false,
      link: `/chat/${chatId}`,
    });

    sendResponse(res, 200, true, "Messages marked as read.", { chatId, userId, status: "read" });

    // Emit socket event for real-time notifications
    global.io.to(chatId).emit("messagesRead", { chatId, userId });
  }
);

/**
 * @desc    Add a reaction to a message
 * @route   POST /chat/message/:messageId/reaction
 * @access  Private
 */
export const addReaction = catchAsync(
  async (
    req: AuthenticatedRequest<{ messageId: string }, {}, { reaction: string }>,
    res: Response<AddReactionResponse>
  ): Promise<void> => {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user?.id;

    const validReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

    if (!validReactions.includes(reaction)) {
      sendResponse(res, 400, false, "Invalid reaction");
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      sendResponse(res, 404, false, "Message not found");
      return;
    }

    // Remove existing reaction from user (if any)
    message.reactions = message.reactions.filter((r) => r.user.toString() !== userId);

    // Add new reaction
    message.reactions.push({
      user: new mongoose.Types.ObjectId(userId),
      emoji: reaction,
      userId: new mongoose.Types.ObjectId(userId),
    });

    await message.save();

    // ✅ Create a notification for the reaction
    await Notification.create({
      user: message.senderId,
      message: `Someone reacted to your message: ${reaction}`,
      type: "message",
      read: false,
      link: `/chat/${message.chatId}`,
    });

    sendResponse(res, 200, true, "Reaction added successfully.", { messageId, reaction, status: "added" });

    // Emit socket event for real-time updates
    global.io.to(message.chatId.toString()).emit("reactionAdded", { messageId, reaction, userId });
  }
);

/**
 * @desc    Get chat history between two users
 * @route   GET /chat/private/:friendId
 * @access  Private
 */
export const getPrivateChats = catchAsync(
  async (
    req: AuthenticatedRequest<{ friendId: string }>,
    res: Response
  ): Promise<void> => {
    const { friendId } = req.params;
    const userId = req.user?.id;

    if (!friendId || !userId) {
      sendResponse(res, 400, false, "Friend ID and user ID are required.");
      return;
    }

    const chat = await Chat.findOne({
      participants: { $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(friendId)] },
    }).populate("messages").lean();

    if (!chat) {
      sendResponse(res, 404, false, "No chat history found.");
      return;
    }

    sendResponse(res, 200, true, "Private chat retrieved successfully.", {
      messages: chat.messages.map((msg: any) => ({
        ...msg,
        _id: msg._id.toHexString(),
      })),
    });
  }
);
