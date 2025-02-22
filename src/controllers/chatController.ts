import type { Response } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import Chat from "../models/Chat";
import Message from "../models/Message";
import Notification from "../models/Notification";
import sendResponse from "../utils/sendResponse";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";

/**
 * @desc Add a reaction to a message
 * @route POST /chat/message/:messageId/reaction
 * @access Private
 */
export const addReaction = catchAsync(async (
  req: AuthenticatedRequest<{ messageId: string }, {}, { reaction: string }>,
  res: Response
): Promise<void> => {
  const { messageId } = req.params;
  const { reaction } = req.body;
  const userId = req.user?.id;

  // ✅ Define allowed reactions
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

  // ✅ Remove existing reaction from user (if any)
  message.reactions = message.reactions.filter((r) => r.userId.toString() !== userId);

  // ✅ Add new reaction
  message.reactions.push({
    userId: new mongoose.Types.ObjectId(userId),
    emoji: reaction,
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

  sendResponse(res, 200, true, "Reaction added successfully.", {
    messageId,
    reaction,
    status: "added",
  });

  // ✅ Emit socket event for real-time updates
  global.io.to(message.chatId.toString()).emit("reactionAdded", { messageId, reaction, userId });
});

/**
 * @desc Send a message (private or group chat)
 * @route POST /chat/send
 * @access Private
 */
export const sendMessage = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string }, {}, { message: string }>,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const { message } = req.body;
  const senderId = req.user?.id;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    sendResponse(res, 400, false, "Invalid chat ID.");
    return;
  }

  if (!message.trim()) {
    sendResponse(res, 400, false, "Message cannot be empty.");
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    sendResponse(res, 404, false, "Chat not found.");
    return;
  }

  const newMessage = await Message.create({
    chatId: chat._id,
    senderId: new mongoose.Types.ObjectId(senderId),
    text: message,
    messageType: chat.chatType,
    timestamp: new Date(),
    status: "sent",
  });

  const messageId = newMessage._id as mongoose.Types.ObjectId;

  chat.messages.push(messageId);
  await chat.save();

  // ✅ Emit socket event for real-time updates
  global.io.to(chatId).emit("newMessage", {
    chatId: chat._id.toString(),
    message: {
      ...newMessage.toObject(),
      _id: messageId.toString(),
    },
  });

  sendResponse(res, 201, true, "Message sent successfully.", {
    chatId: chat._id.toString(),
    message: {
      ...newMessage.toObject(),
      _id: messageId.toString(),
    },
  });
});

/**
 * @desc Retrieve private chat history between two users
 * @route GET /chat/private/:friendId
 * @access Private
 */
export const getPrivateChats = catchAsync(async (
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
  }).populate("messages");

  if (!chat) {
    sendResponse(res, 404, false, "No chat history found.");
    return;
  }

  sendResponse(res, 200, true, "Private chat retrieved successfully.", {
    chatId: chat._id.toString(),
    messages: chat.messages.map((msg: any) => ({
      ...msg.toObject(),
      _id: msg._id.toString(),
    })),
  });
});

/**
 * @desc Get full chat history (group or private)
 * @route GET /chat/history/:chatId
 * @access Private
 */
export const getChatHistory = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string }>,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    sendResponse(res, 400, false, "Invalid chat ID.");
    return;
  }

  const chat = await Chat.findById(chatId).populate("messages").lean();

  if (!chat) {
    sendResponse(res, 404, false, "Chat history not found.");
    return;
  }

  sendResponse(res, 200, true, "Chat history retrieved successfully.", { chat });
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

  const newMessage = await Message.create({
    chatId: chat._id,
    senderId: senderObjectId,
    receiverId: receiverObjectId,
    text: message,
    messageType: "private",
    timestamp: new Date(),
    status: "sent",
  });

  const messageId = newMessage._id as mongoose.Types.ObjectId;
  chat.messages.push(messageId);
  
  // ✅ Update unread message count
  chat.unreadMessages = chat.unreadMessages.map(unread =>
    unread.userId.toString() === receiverObjectId.toString()
      ? { ...unread, count: unread.count + 1 }
      : unread
  );

  await chat.save();

  await Notification.create({
    user: receiverObjectId,
    message: `New message from ${senderId}`,
    type: "message",
    read: false,
    link: `/chat/private/${senderId}`,
  });

  sendResponse(res, 201, true, "Message sent successfully.", {
    chatId: chat._id.toString(),
    message: {
      ...newMessage.toObject(),
      _id: messageId.toString(),
    },
  });

  global.io.to(friendId).emit("newMessage", { chatId: chat._id.toString(), message: newMessage });
});

/**
 * @desc Mark messages as read
 * @route POST /chat/:chatId/read
 * @access Private
 */
export const markMessagesAsRead = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string }>,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  await Message.updateMany(
    { chatId, status: "sent", senderId: { $ne: userId } },
    { $set: { status: "seen" } }
  );

  await Chat.updateOne(
    { _id: chatId, "unreadMessages.userId": userId },
    { $set: { "unreadMessages.$.count": 0 } }
  );

  sendResponse(res, 200, true, "Messages marked as read.");
  global.io.to(chatId).emit("messagesRead", { chatId, userId });
});

/**
 * @desc Typing indicator
 * @route POST /chat/:chatId/typing
 * @access Private
 */
export const typingIndicator = catchAsync(async (
  req: AuthenticatedRequest<{ chatId: string }>,
  res: Response
): Promise<void> => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  global.io.to(chatId).emit("userTyping", { chatId, userId });
  sendResponse(res, 200, true, "Typing indicator sent.");
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
