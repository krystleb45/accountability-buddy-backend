// src/api/services/MessageService.ts
import { Types } from "mongoose";
import { Message, IMessage, MessageType } from "../models/Message";
import { User } from "../models/User";
import { createError } from "../middleware/errorHandler";

export interface MessagePage {
  messages: IMessage[];
  pagination: {
    totalMessages: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface MessageThread {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  }>;
  group?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: IMessage;
  unreadCount: number;
  messageType: "private" | "group"; // Changed from "direct" to "private"
  createdAt: string;
  updatedAt: string;
}

export interface MessageStats {
  totalMessages: number;
  unreadMessages: number;
  totalThreads: number;
  privateMessages: number; // Changed from directMessages to privateMessages
  groupMessages: number;
}

export default class MessageService {
  // =====================================================
  // EXISTING METHODS (Updated for new Message model)
  // =====================================================

  /**
   * Send a new message (updated to support both private and group messages)
   */
  static async sendMessage(
    senderId: string,
    recipientId?: string,
    content?: string,
    messageType: string = "private", // Changed from "direct" to "private"
    groupId?: string
  ): Promise<IMessage> {
    if (!Types.ObjectId.isValid(senderId)) {
      throw createError("Invalid sender ID", 400);
    }

    // Validate based on message type
    if (messageType === "private") { // Changed from "direct" to "private"
      if (!recipientId || !Types.ObjectId.isValid(recipientId)) {
        throw createError("Invalid recipient ID for private message", 400); // Updated error message
      }
      if (senderId === recipientId) {
        throw createError("Cannot send a message to yourself", 400);
      }

      const receiver = await User.findById(recipientId);
      if (!receiver) {
        throw createError("Recipient not found", 404);
      }
    } else if (messageType === "group") {
      if (!groupId || !Types.ObjectId.isValid(groupId)) {
        throw createError("Invalid group ID for group message", 400);
      }
      // Add group validation here if you have a Group model
    }

    const messageContent = content?.trim();
    if (!messageContent) {
      throw createError("Message content cannot be empty", 400);
    }

    // Create or find chat ID (for now, use a combination approach)
    let chatId: Types.ObjectId;
    if (messageType === "private") { // Changed from "direct" to "private"
      // For private messages, create a consistent chatId from user IDs
      const ids = [senderId, recipientId!].sort();
      chatId = new Types.ObjectId(ids.join("").slice(0, 24).padEnd(24, "0"));
    } else {
      // For group messages, use the groupId as chatId
      chatId = new Types.ObjectId(groupId);
    }

    const message = await Message.create({
      chatId,
      senderId,
      receiverId: messageType === "private" ? recipientId : undefined, // Changed from "direct" to "private"
      text: messageContent,
      messageType: messageType as MessageType,
      status: "sent",
      timestamp: new Date(),
    });

    // Populate sender info before returning
    await message.populate("senderId", "username email profilePicture");
    return message;
  }

  /**
   * Get messages with a specific user (legacy compatibility)
   */
  static async getMessagesWithUser(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 20
  ): Promise<MessagePage> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(otherUserId)) {
      throw createError("Invalid user ID(s)", 400);
    }

    // Create consistent chatId for private messages
    const ids = [userId, otherUserId].sort();
    const chatId = new Types.ObjectId(ids.join("").slice(0, 24).padEnd(24, "0"));

    const totalMessages = await Message.countDocuments({
      chatId,
      status: { $ne: "deleted" }
    });

    const messages = await Message.find({
      chatId,
      status: { $ne: "deleted" }
    })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("senderId", "username email profilePicture")
      .populate("receiverId", "username email profilePicture")
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
   * Delete a message
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw createError("Invalid message ID", 400);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw createError("Message not found", 404);
    }

    if (message.senderId.toString() !== userId) {
      throw createError("You are not authorized to delete this message", 403);
    }

    await message.softDelete();
  }

  /**
   * Mark messages as read (legacy)
   */
  static async markMessagesAsRead(
    senderId: string,
    receiverId: string
  ): Promise<number> {
    if (!Types.ObjectId.isValid(senderId) || !Types.ObjectId.isValid(receiverId)) {
      throw createError("Invalid user ID(s)", 400);
    }

    // Create consistent chatId
    const ids = [senderId, receiverId].sort();
    const chatId = new Types.ObjectId(ids.join("").slice(0, 24).padEnd(24, "0"));

    const result = await Message.updateMany(
      {
        chatId,
        senderId,
        status: { $nin: ["seen", "deleted"] }
      },
      { status: "seen" }
    );

    return result.modifiedCount;
  }

  // =====================================================
  // NEW METHODS FOR ENHANCED MESSAGING
  // =====================================================

  /**
   * Get all conversation threads for a user
   */
  static async getMessageThreads(
    userId: string,
    options: {
      limit?: number;
      page?: number;
      messageType?: string;
      search?: string;
    } = {}
  ): Promise<MessageThread[]> {
    const { limit = 20, page = 1, messageType } = options;

    // Build match criteria
    const matchCriteria: any = {
      $or: [
        { senderId: new Types.ObjectId(userId) },
        { receiverId: new Types.ObjectId(userId) }
      ],
      status: { $ne: "deleted" }
    };

    if (messageType) {
      matchCriteria.messageType = messageType;
    }

    // Aggregate to get unique conversations with last message
    const pipeline: any[] = [
      { $match: matchCriteria },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$chatId",
          lastMessage: { $first: "$ROOT" },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$senderId", new Types.ObjectId(userId)] },
                    { $ne: ["$status", "seen"] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { "lastMessage.timestamp": -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.senderId",
          foreignField: "_id",
          as: "sender"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.receiverId",
          foreignField: "_id",
          as: "receiver"
        }
      }
    ];

    const threads = await Message.aggregate(pipeline);

    // Transform to MessageThread format
    return threads.map(thread => {
      const lastMessage = thread.lastMessage;

      // Skip threads with no lastMessage
      if (!lastMessage) {
        return null;
      }

      const sender = thread.sender[0];
      const receiver = thread.receiver[0];

      // Determine participants (exclude current user)
      const participants = [];
      if (sender && sender._id.toString() !== userId) {
        participants.push({
          _id: sender._id.toString(),
          name: sender.username || sender.email,
          avatar: sender.profilePicture
        });
      }
      if (receiver && receiver._id.toString() !== userId) {
        participants.push({
          _id: receiver._id.toString(),
          name: receiver.username || receiver.email,
          avatar: receiver.profilePicture
        });
      }

      return {
        _id: thread._id.toString(),
        participants,
        lastMessage,
        unreadCount: thread.unreadCount,
        messageType: lastMessage.messageType, // Keep as is since it's already "private" or "group"
        createdAt: lastMessage.createdAt,
        updatedAt: lastMessage.updatedAt
      };
    }).filter(thread => thread !== null); // Remove null entries
  }

  /**
   * Get messages in a specific thread
   */
  static async getMessagesInThread(
    threadId: string,
    _userId: string, // Prefixed with underscore to indicate intentionally unused
    options: {
      limit?: number;
      page?: number;
      before?: string;
    } = {}
  ): Promise<{ messages: IMessage[]; hasMore: boolean; total: number }> {
    const { limit = 50, page = 1, before } = options;

    if (!Types.ObjectId.isValid(threadId)) {
      throw createError("Invalid thread ID", 400);
    }

    const query: any = {
      chatId: threadId,
      status: { $ne: "deleted" }
    };

    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const total = await Message.countDocuments({
      chatId: threadId,
      status: { $ne: "deleted" }
    });

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1) // Get one extra to check if there are more
      .populate("senderId", "username email profilePicture")
      .populate("receiverId", "username email profilePicture")
      .exec();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra message
    }

    return {
      messages: messages.reverse(), // Return in chronological order
      hasMore,
      total
    };
  }

  /**
   * Mark all messages in a thread as read
   */
  static async markThreadAsRead(threadId: string, userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(threadId)) {
      throw createError("Invalid thread ID", 400);
    }

    const result = await Message.updateMany(
      {
        chatId: threadId,
        senderId: { $ne: userId }, // Only mark messages not sent by current user
        status: { $nin: ["seen", "deleted"] }
      },
      { status: "seen" }
    );

    return result.modifiedCount;
  }

  /**
   * Get recent messages for dashboard
   */
  static async getRecentMessages(userId: string, limit = 5): Promise<IMessage[]> {
    return await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      status: { $ne: "deleted" }
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("senderId", "username email profilePicture")
      .populate("receiverId", "username email profilePicture")
      .exec();
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await Message.countDocuments({
      receiverId: userId,
      status: { $nin: ["seen", "deleted"] }
    });
  }

  /**
   * Get message statistics
   */
  static async getMessageStats(userId: string): Promise<MessageStats> {
    const userIdObj = new Types.ObjectId(userId);

    const [totalMessages, unreadMessages, privateMessages, groupMessages] = await Promise.all([
      Message.countDocuments({
        $or: [{ senderId: userIdObj }, { receiverId: userIdObj }],
        status: { $ne: "deleted" }
      }),
      Message.countDocuments({
        receiverId: userIdObj,
        status: { $nin: ["seen", "deleted"] }
      }),
      Message.countDocuments({
        $or: [{ senderId: userIdObj }, { receiverId: userIdObj }],
        messageType: "private", // Changed from "direct" to "private"
        status: { $ne: "deleted" }
      }),
      Message.countDocuments({
        $or: [{ senderId: userIdObj }, { receiverId: userIdObj }],
        messageType: "group",
        status: { $ne: "deleted" }
      })
    ]);

    // Count unique threads
    const threadsPipeline = [
      {
        $match: {
          $or: [{ senderId: userIdObj }, { receiverId: userIdObj }],
          status: { $ne: "deleted" }
        }
      },
      { $group: { _id: "$chatId" } },
      { $count: "totalThreads" }
    ];

    const threadsResult = await Message.aggregate(threadsPipeline);
    const totalThreads = threadsResult[0]?.totalThreads || 0;

    return {
      totalMessages,
      unreadMessages,
      totalThreads,
      privateMessages, // Changed from directMessages to privateMessages
      groupMessages
    };
  }

  /**
   * Get a specific message by ID
   */
  static async getMessageById(messageId: string, userId: string): Promise<IMessage> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw createError("Invalid message ID", 400);
    }

    const message = await Message.findOne({
      _id: messageId,
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: { $ne: "deleted" }
    })
      .populate("senderId", "username email profilePicture")
      .populate("receiverId", "username email profilePicture");

    if (!message) {
      throw createError("Message not found", 404);
    }

    return message;
  }

  /**
   * Edit a message
   */
  static async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<IMessage> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw createError("Invalid message ID", 400);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw createError("Message not found", 404);
    }

    if (message.senderId.toString() !== userId) {
      throw createError("You are not authorized to edit this message", 403);
    }

    if (!newContent.trim()) {
      throw createError("Message content cannot be empty", 400);
    }

    return await message.edit(newContent.trim());
  }

  /**
   * Add a reaction to a message
   */
  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessage> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw createError("Invalid message ID", 400);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw createError("Message not found", 404);
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingReaction) {
      throw createError("You have already reacted with this emoji", 400);
    }

    return await message.addReaction(new Types.ObjectId(userId), emoji);
  }

  /**
   * Remove a reaction from a message
   */
  static async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessage> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw createError("Invalid message ID", 400);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw createError("Message not found", 404);
    }

    // Remove the specific reaction
    message.reactions = message.reactions.filter(
      r => !(r.userId.toString() === userId && r.emoji === emoji)
    ) as any;

    await message.save();
    return message;
  }

  /**
   * Mark multiple messages as read
   */
  static async markMultipleMessagesAsRead(
    messageIds: string[],
    userId: string
  ): Promise<number> {
    const validIds = messageIds.filter(id => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      throw createError("No valid message IDs provided", 400);
    }

    const result = await Message.updateMany(
      {
        _id: { $in: validIds },
        receiverId: userId, // Only mark messages received by this user
        status: { $nin: ["seen", "deleted"] }
      },
      { status: "seen" }
    );

    return result.modifiedCount;
  }

  /**
   * Search messages
   */
  static async searchMessages(
    userId: string,
    searchQuery: string,
    options: {
      messageType?: string;
      recipientId?: string;
      groupId?: string;
      limit?: number;
    } = {}
  ): Promise<IMessage[]> {
    const { messageType, recipientId, groupId, limit = 20 } = options;

    const query: any = {
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: { $ne: "deleted" },
      text: { $regex: searchQuery, $options: "i" }
    };

    if (messageType) {
      query.messageType = messageType;
    }

    if (recipientId && Types.ObjectId.isValid(recipientId)) {
      query.$and = [
        query.$and || {},
        {
          $or: [
            { senderId: userId, receiverId: recipientId },
            { senderId: recipientId, receiverId: userId }
          ]
        }
      ];
    }

    if (groupId && Types.ObjectId.isValid(groupId)) {
      query.chatId = groupId;
    }

    return await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("senderId", "username email profilePicture")
      .populate("receiverId", "username email profilePicture")
      .exec();
  }
}
