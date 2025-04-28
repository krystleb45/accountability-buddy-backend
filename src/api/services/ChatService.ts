// src/api/services/ChatService.ts
import { Types } from "mongoose";
import Chat, { IChat } from "../models/Chat";
import Message, { IMessage } from "../models/Message";

export interface PaginatedMessages {
  messages: IMessage[];
  totalMessages: number;
  totalPages: number;
  currentPage: number;
}

export default class ChatService {
  /**
   * Fetch paginated messages for a chat.
   */
  static async fetchMessages(
    chatId: string,
    page: number,
    limit: number
  ): Promise<PaginatedMessages> {
    if (!Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chat ID");
    }
    const skip = (page - 1) * limit;
    const [messages, totalMessages] = await Promise.all([
      Message.find({ chatId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Message.countDocuments({ chatId }),
    ]);
    const totalPages = Math.ceil(totalMessages / limit);
    return { messages, totalMessages, totalPages, currentPage: page };
  }

  /**
   * Get existing private chat between two users, or create one.
   */
  static async getOrCreatePrivateChat(
    userA: string,
    userB: string
  ): Promise<IChat> {
    const a = new Types.ObjectId(userA);
    const b = new Types.ObjectId(userB);

    let chat = await Chat.findOne({
      chatType: "private",
      participants: { $all: [a, b] },
    }).exec();

    if (!chat) {
      chat = await Chat.create({
        chatType: "private",
        participants: [a, b],
        messages: [],
        unreadMessages: [],
      });
    }

    return chat;
  }

  /**
   * Append a new message to a chat.
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    encryptedText: string
  ): Promise<IMessage> {
    if (!Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chat ID");
    }
    const msg = await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      text: encryptedText,
      messageType: "private",
      timestamp: new Date(),
      status: "sent",
    });
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: msg._id },
      // increment unread count for receiver
      $inc: { "unreadMessages.$[elem].count": 1 },
    }, {
      arrayFilters: [{ "elem.userId": receiverId }],
    });
    return msg;
  }

  /**
   * Update an existing message’s text + status.
   */
  static async editMessage(
    messageId: string,
    encryptedText: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error("Invalid message ID");
    }
    await Message.findByIdAndUpdate(messageId, {
      text: encryptedText,
      status: "edited",
    }).exec();
  }

  /**
   * Soft-delete a message (replace text + status).
   */
  static async deleteMessage(messageId: string): Promise<void> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error("Invalid message ID");
    }
    await Message.findByIdAndUpdate(messageId, {
      text: "This message has been deleted.",
      status: "deleted",
    }).exec();
  }

  /**
   * Reset unread count for a user in a chat.
   */
  static async markRead(chatId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chat ID");
    }
    await Chat.updateOne(
      { _id: chatId, "unreadMessages.userId": userId },
      { $set: { "unreadMessages.$.count": 0 } }
    ).exec();
  }

  /**
   * Fetch all messages in a private chat (no pagination).
   */
  static async fetchPrivateHistory(
    userA: string,
    userB: string
  ): Promise<IMessage[]> {
    const chat = await Chat.findOne({
      chatType: "private",
      participants: {
        $all: [
          new Types.ObjectId(userA),
          new Types.ObjectId(userB),
        ],
      },
    }).exec();

    if (!chat) {
      throw new Error("Private chat not found");
    }

    return Message.find({ chatId: chat._id }).sort({ timestamp: 1 }).exec();
  }
}
