// src/api/services/AnonymousMilitaryChatService.ts - FIXED: Added return types

import { AnonymousMilitaryMessage, AnonymousSession } from "../models/AnonymousMilitaryChat";
import { createError } from "../middleware/errorHandler";

const VALID_ROOMS = ["veterans-support", "active-duty", "family-members"];

const ROOM_DETAILS = {
  "veterans-support": {
    name: "Veterans Support",
    description: "Connect with fellow veterans for peer support and shared experiences",
    icon: "🎖️"
  },
  "active-duty": {
    name: "Active Duty",
    description: "Support for currently serving military personnel",
    icon: "⚡"
  },
  "family-members": {
    name: "Family Members",
    description: "Support for military families and loved ones",
    icon: "👥"
  }
};

// Crisis keywords that trigger resource display
const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end it all", "hurt myself", "want to die",
  "no point", "give up", "can't go on", "hopeless", "worthless"
];

// Types for return values
interface ChatRoom {
  id: string;
  name: string;
  description: string;
  icon: string;
  memberCount: string;
}

interface JoinRoomResult {
  memberCount: number;
}

interface MessageResult {
  messageId: string;
  isFlagged: boolean;
  message: {
    id: string;
    displayName: string;
    message: string;
    timestamp: Date;
    isFlagged: boolean;
  };
}

interface AnonymousUser {
  sessionId: string;
  displayName: string;
}

class AnonymousMilitaryChatService {

  /**
   * Get all available anonymous chat rooms with member counts
   */
  static async getRooms(): Promise<ChatRoom[]> {
    const rooms = await Promise.all(
      VALID_ROOMS.map(async (roomId) => {
        const memberCount = await AnonymousSession.countDocuments({
          room: roomId,
          lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Active in last 5 minutes
        });

        return {
          id: roomId,
          ...ROOM_DETAILS[roomId as keyof typeof ROOM_DETAILS],
          memberCount: `${memberCount} online`
        };
      })
    );

    return rooms;
  }

  /**
   * Join an anonymous chat room
   */
  static async joinRoom(roomId: string, sessionId: string, displayName: string): Promise<JoinRoomResult> {
    if (!VALID_ROOMS.includes(roomId)) {
      throw createError("Invalid room ID", 400);
    }

    // Create or update session
    await AnonymousSession.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        displayName,
        room: roomId,
        lastActive: new Date(),
        joinedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Get current member count
    const memberCount = await AnonymousSession.countDocuments({
      room: roomId,
      lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    return { memberCount };
  }

  /**
   * Leave an anonymous chat room
   */
  static async leaveRoom(sessionId: string): Promise<void> {
    await AnonymousSession.deleteOne({ sessionId });
  }

  /**
   * Get recent messages for a room
   */
  static async getMessages(roomId: string, limit = 50): Promise<any[]> {
    if (!VALID_ROOMS.includes(roomId)) {
      throw createError("Invalid room ID", 400);
    }

    const messages = await AnonymousMilitaryMessage.find({ room: roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("displayName message createdAt isFlagged -_id");

    return messages.reverse(); // Return oldest first for chat display
  }

  /**
   * Send a message to a room
   */
  static async sendMessage(roomId: string, sessionId: string, displayName: string, message: string): Promise<MessageResult> {
    if (!VALID_ROOMS.includes(roomId)) {
      throw createError("Invalid room ID", 400);
    }

    if (!message || message.trim().length === 0) {
      throw createError("Message is required", 400);
    }

    if (message.length > 500) {
      throw createError("Message too long (max 500 characters)", 400);
    }

    // Check for crisis keywords
    const containsCrisisContent = CRISIS_KEYWORDS.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    // Create message
    const newMessage = await AnonymousMilitaryMessage.create({
      room: roomId,
      anonymousSessionId: sessionId,
      displayName,
      message: message.trim(),
      isFlagged: containsCrisisContent
    });

    // Update user's last active time
    await AnonymousSession.findOneAndUpdate(
      { sessionId },
      { lastActive: new Date() }
    );

    return {
      messageId: newMessage._id.toString(),
      isFlagged: containsCrisisContent,
      message: {
        id: newMessage._id.toString(),
        displayName: newMessage.displayName,
        message: newMessage.message,
        timestamp: newMessage.createdAt,
        isFlagged: newMessage.isFlagged
      }
    };
  }

  /**
   * Get current member count for a room
   */
  static async getRoomMemberCount(roomId: string): Promise<number> {
    const memberCount = await AnonymousSession.countDocuments({
      room: roomId,
      lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    return memberCount;
  }

  /**
   * Generate anonymous username
   */
  static generateAnonymousUser(): AnonymousUser {
    const adjectives = ["Brave", "Strong", "Resilient", "Courageous", "United", "Dedicated", "Honor", "Loyal"];
    const nouns = ["Warrior", "Guardian", "Defender", "Veteran", "Hero", "Soldier", "Marine", "Sailor"];

    const displayName = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

    return {
      sessionId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      displayName
    };
  }
}

export default AnonymousMilitaryChatService;
