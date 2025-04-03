// utils/chatroomUtils.ts

import type { IMilitarySupportChatroom } from "../models/MilitarySupportChatroom";
import type { IUser } from "../models/User";

/**
 * Format a military chatroom to be returned in API responses
 * @param chatroom - The raw chatroom document
 * @returns A simplified and consistent shape for frontend consumption
 */
export const formatChatroom = (chatroom: IMilitarySupportChatroom): {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
} => {
  return {
    id: chatroom._id.toString(), // Convert ObjectId to string
    name: chatroom.name,
    description: chatroom.description,
    memberCount: chatroom.members.length,
    createdAt: chatroom.createdAt,
    updatedAt: chatroom.updatedAt,
  };
};

/**
 * Enrich chatroom with user info (optional – for admin/moderator usage)
 * @param chatroom - The chatroom document
 * @param users - Array of user objects
 */
export const populateChatroomMembers = (
  chatroom: IMilitarySupportChatroom,
  users: IUser[]
): {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    username: string;
    email: string;
    avatar: string;
  }[]
} => {
  const enrichedMembers = users
    .filter((user) => chatroom.members.includes(user._id))
    .map((user) => ({
      id: user._id.toString(), // Convert ObjectId to string
      username: user.username,
      email: user.email,
      avatar: user.profilePicture || "", // Provide default empty string if undefined
    }));
  
  return {
    ...formatChatroom(chatroom),
    members: enrichedMembers,
  };
};
