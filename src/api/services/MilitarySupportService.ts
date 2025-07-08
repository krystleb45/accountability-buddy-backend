// src/api/services/MilitarySupportService.ts - FIXED: Corrected import path

import { createError } from "../middleware/errorHandler";
import LoggingService from "./LoggingService";
import {
  ExternalSupportResource,
  IExternalSupportResource,
  ResourceCategory,
} from "../models/MilitaryResource"; // FIXED: Changed from MilitaryResource
import MilitarySupportChatroom, {
  IMilitarySupportChatroom,
} from "../models/MilitarySupportChatroom";
import MilitaryMessage, { IMilitaryMessage } from "../models/MilitaryMessage";

const DISCLAIMER_TEXT = `
  Disclaimer: The information provided in this platform is for support purposes only
  and does not replace professional medical, legal, or mental health advice.
  If you are in crisis, please contact emergency services or a licensed professional immediately.
`.trim();

class MilitarySupportService {
  // —— Resource methods —— //

  /** List all active resources, most recent first. */
  static async listResources(): Promise<IExternalSupportResource[]> {
    const resources = await ExternalSupportResource.find({ isActive: true }) // ADDED: Only active resources
      .sort({ createdAt: -1 })
      .exec();
    if (resources.length === 0) {
      throw createError("No military resources found", 404);
    }
    void LoggingService.logInfo(`Fetched ${resources.length} resources`);
    return resources;
  }

  /** Get disclaimer text. */
  static getDisclaimer(): string {
    return DISCLAIMER_TEXT;
  }

  /** Find all in a given category. */
  static async findByCategory(
    category: ResourceCategory
  ): Promise<IExternalSupportResource[]> {
    if (!["hotline","website","forum","organization","other"].includes(category)) {
      throw createError("Invalid category", 400);
    }
    const list = await ExternalSupportResource.findByCategory(category);
    void LoggingService.logInfo(
      `Fetched ${list.length} resources in category ${category}`
    );
    return list;
  }

  /** Search by title text. */
  static async searchByTitle(text: string): Promise<IExternalSupportResource[]> {
    if (!text.trim()) {
      throw createError("Search text is required", 400);
    }
    const results = await ExternalSupportResource.searchByTitle(text);
    void LoggingService.logInfo(
      `Found ${results.length} resources matching "${text}"`
    );
    return results;
  }

  /** Activate or deactivate a resource. */
  static async setActive(
    id: string,
    active: boolean
  ): Promise<IExternalSupportResource> {
    const resrc = await ExternalSupportResource.findById(id);
    if (!resrc) throw createError("Resource not found", 404);
    const updated = active ? await resrc.activate() : await resrc.deactivate();
    void LoggingService.logInfo(
      `Resource ${id} marked ${active ? "active" : "inactive"}`
    );
    return updated;
  }

  // —— Chatroom & message methods —— //

  /** List all active chatrooms. */
  static async listChatrooms(): Promise<IMilitarySupportChatroom[]> {
    const rooms = await MilitarySupportChatroom.find({ isActive: true }) // ADDED: Only active chatrooms
      .sort({ createdAt: -1 });
    if (rooms.length === 0) {
      throw createError("No military chatrooms found", 404);
    }
    void LoggingService.logInfo(`Fetched ${rooms.length} chatrooms`);
    return rooms;
  }

  /**
   * Create a new chatroom.
   * Automatically adds the creator as a member.
   */
  static async createChatroom(
    name: string,
    description: string,
    creatorId: string
  ): Promise<IMilitarySupportChatroom> {
    if (await MilitarySupportChatroom.exists({ name })) {
      throw createError("A chatroom with this name already exists", 409);
    }
    const room = await MilitarySupportChatroom.create({
      name,
      description,
      members: [creatorId],
      createdAt: new Date(),
    });
    void LoggingService.logInfo(`Chatroom created: ${room._id} by ${creatorId}`);
    return room;
  }

  /**
   * Send a message into a chatroom.
   * Returns the saved message.
   */
  static async sendMessage(
    chatroomId: string,
    userId: string,
    text: string
  ): Promise<IMilitaryMessage> {
    // ensure room exists and is active
    const room = await MilitarySupportChatroom.findOne({
      _id: chatroomId,
      isActive: true
    });
    if (!room) throw createError("Chatroom not found or inactive", 404);

    // Check if user is a member of the room
    if (!room.members.includes(userId as any)) {
      throw createError("User is not a member of this chatroom", 403);
    }

    const msg = await MilitaryMessage.create({
      chatroom: chatroomId,
      user: userId,
      text,
      timestamp: new Date(),
    });
    void LoggingService.logInfo(
      `Message ${msg._id} sent in room ${chatroomId} by ${userId}`
    );
    return msg;
  }

  /**
   * Get messages for a chatroom.
   * Only for members of the room.
   */
  static async getChatroomMessages(
    chatroomId: string,
    userId: string,
    limit = 50
  ): Promise<IMilitaryMessage[]> {
    // Verify user is member of room
    const room = await MilitarySupportChatroom.findOne({
      _id: chatroomId,
      isActive: true,
      members: userId
    });
    if (!room) {
      throw createError("Chatroom not found or access denied", 404);
    }

    const messages = await MilitaryMessage.getByChatroom(chatroomId as any, limit);
    void LoggingService.logInfo(
      `Fetched ${messages.length} messages for room ${chatroomId}`
    );
    return messages;
  }

  /**
   * Join a chatroom.
   */
  static async joinChatroom(
    chatroomId: string,
    userId: string
  ): Promise<IMilitarySupportChatroom> {
    const room = await MilitarySupportChatroom.findOne({
      _id: chatroomId,
      isActive: true
    });
    if (!room) throw createError("Chatroom not found", 404);

    // Add user if not already a member
    const updatedRoom = await room.addMember(userId as any);
    void LoggingService.logInfo(
      `User ${userId} joined room ${chatroomId}`
    );
    return updatedRoom;
  }
}

export default MilitarySupportService;
