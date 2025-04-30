// src/api/services/MessageService.ts
import { Types } from "mongoose";
import { PrivateMessage, IPrivateMessage } from "../models/PrivateMessage";
import { User } from "../models/User";
import { createError } from "../middleware/errorHandler";

export interface MessagePage {
  messages: IPrivateMessage[];
  pagination: {
    totalMessages: number;
    currentPage: number;
    totalPages: number;
  };
}

export default class MessageService {
  /**
   * Send a new private message.
   */
  static async sendMessage(
    senderId: string,
    receiverId: string,
    rawContent: string
  ): Promise<IPrivateMessage> {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(receiverId)
    ) {
      throw createError("Invalid sender or receiver ID", 400);
    }
    if (senderId === receiverId) {
      throw createError("Cannot send a message to yourself", 400);
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw createError("Receiver not found", 404);
    }

    const content = rawContent.trim();
    if (!content) {
      throw createError("Message content cannot be empty", 400);
    }

    const message = await PrivateMessage.create({
      sender: senderId,
      receiver: receiverId,
      content,
      createdAt: new Date(),
    });
    return message;
  }

  /**
   * Fetch a paginated conversation between two users.
   */
  static async getMessagesWithUser(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 20
  ): Promise<MessagePage> {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(otherUserId)
    ) {
      throw createError("Invalid user ID(s)", 400);
    }

    const query = {
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    };

    const totalMessages = await PrivateMessage.countDocuments(query);

    const messages = await PrivateMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      messages,
      pagination: {
        totalMessages,
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
      },
    };
  }

  /**
   * Delete one’s own message.
   */
  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw createError("Invalid message ID", 400);
    }
    const msg = await PrivateMessage.findById(messageId);
    if (!msg) {
      throw createError("Message not found", 404);
    }
    if (msg.sender.toString() !== userId) {
      throw createError("You are not authorized to delete this message", 403);
    }
    await msg.deleteOne();
  }

  /**
   * Mark all unread messages from a given sender as read.
   * Returns the number of messages updated.
   */
  static async markMessagesAsRead(
    senderId: string,
    receiverId: string
  ): Promise<number> {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(receiverId)
    ) {
      throw createError("Invalid user ID(s)", 400);
    }
    const result = await PrivateMessage.updateMany(
      { sender: senderId, receiver: receiverId, isRead: false },
      { isRead: true }
    );
    return result.modifiedCount;
  }
}
