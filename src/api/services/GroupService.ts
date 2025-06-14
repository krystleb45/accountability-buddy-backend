// src/api/services/GroupService.ts - Updated with new methods
import mongoose from "mongoose";
import { Server } from "socket.io";
import Group, { IGroup } from "../models/Group";
import GroupMessage, { IGroupMessage } from "../models/GroupMessage";
import Notification from "../models/Notification";
import { logger } from "../../utils/winstonLogger";

interface FormattedGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isPublic: boolean;
  isJoined: boolean;
  lastActivity: string;
  avatar: string | null;
  tags: string[];
  createdBy: string;
  createdAt: string;
}

interface FormattedMember {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
  role: "admin" | "member";
  joinedAt: string;
  isOnline: boolean;
}

class GroupService {
  /**
   * Get all groups with optional filters
   */
  async getGroups(
    userId: string,
    category?: string,
    search?: string
  ): Promise<FormattedGroup[]> {
    const filter: any = {
      isPublic: true // Only show public groups in general listing
    };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    const groups = await Group.find(filter)
      .populate("createdBy", "name")
      .sort({ lastActivity: -1 })
      .limit(20)
      .lean();

    // Check which groups the user has joined
    const userObjectId = new mongoose.Types.ObjectId(userId);

    return groups.map(group => ({
      id: group._id.toString(),
      name: group.name,
      description: group.description || "",
      category: group.category || "general",
      memberCount: group.members?.length || 0,
      isPublic: group.isPublic ?? true,
      isJoined: group.members?.some((memberId: any) => memberId.equals(userObjectId)) || false,
      lastActivity: group.lastActivity?.toISOString() || group.createdAt.toISOString(),
      avatar: group.avatar || null,
      tags: group.tags || [],
      createdBy: (group.createdBy as any)?.name || "Unknown",
      createdAt: group.createdAt.toISOString()
    }));
  }

  /**
   * Create a new group (simplified signature)
   */
  async createGroup(
    name: string,
    description: string,
    category: string,
    creatorId: string
  ): Promise<FormattedGroup> {
    const group = await Group.create({
      name,
      description,
      category,
      isPublic: true, // Default to public
      inviteOnly: false, // Default to not invite-only
      tags: [], // Default empty tags
      createdBy: new mongoose.Types.ObjectId(creatorId),
      members: [new mongoose.Types.ObjectId(creatorId)],
      lastActivity: new Date(),
      unreadMessages: [],
    });

    await group.populate("createdBy", "name");

    logger.info(`Group ${group._id} created by ${creatorId}`);

    return {
      id: group._id.toString(),
      name: group.name,
      description: group.description ?? "",
      category: group.category,
      memberCount: 1,
      isPublic: group.isPublic,
      isJoined: true,
      lastActivity: group.lastActivity.toISOString(),
      avatar: group.avatar || null,
      tags: group.tags || [],
      createdBy: (group.createdBy as any).name,
      createdAt: group.createdAt.toISOString()
    };
  }

  /**
   * Get specific group details
   */
  async getGroupDetails(groupId: string, userId: string): Promise<FormattedGroup | null> {
    const group = await Group.findById(groupId)
      .populate("createdBy", "name")
      .lean();

    if (!group) return null;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isJoined = group.members?.some((memberId: any) => memberId.equals(userObjectId)) || false;

    // For private groups, only return details if user is a member
    if (!group.isPublic && !isJoined) {
      return null;
    }

    return {
      id: group._id.toString(),
      name: group.name,
      description: group.description || "",
      category: group.category || "general",
      memberCount: group.members?.length || 0,
      isPublic: group.isPublic ?? true,
      isJoined: isJoined,
      lastActivity: group.lastActivity?.toISOString() || group.createdAt.toISOString(),
      avatar: group.avatar || null,
      tags: group.tags || [],
      createdBy: (group.createdBy as any)?.name || "Unknown",
      createdAt: group.createdAt.toISOString()
    };
  }

  /**
   * Add a member to a group
   */
  async joinGroup(
    groupId: string,
    userId: string,
    io: Server
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    // Check if group is private and requires invitation
    if (!group.isPublic && group.inviteOnly) {
      throw new Error("This group requires an invitation");
    }

    const uid = new mongoose.Types.ObjectId(userId);
    if (group.members.some(m => m.equals(uid))) {
      throw new Error("Already a member");
    }

    group.members.push(uid);
    group.lastActivity = new Date();
    await group.save();

    // Notify everyone in the group room
    io.in(groupId).emit("userJoined", { userId });

    logger.info(`User ${userId} joined group ${groupId}`);
  }

  /**
   * Remove a member from a group
   */
  async leaveGroup(
    groupId: string,
    userId: string,
    io: Server
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    const uid = new mongoose.Types.ObjectId(userId);

    // Check if user is a member
    if (!group.members.some(m => m.equals(uid))) {
      throw new Error("Not a member of this group");
    }

    // Prevent creator from leaving if they're the only admin
    if (group.createdBy.equals(uid)) {
      // You might want to implement admin transfer logic here
      // For now, we'll allow it but could add admin count check
    }

    group.members = group.members.filter(m => !m.equals(uid));
    group.lastActivity = new Date();
    await group.save();

    // Broadcast to the group room
    io.in(groupId).emit("userLeft", { userId });

    logger.info(`User ${userId} left group ${groupId}`);
  }

  /**
   * Update group details (admin only)
   */
  async updateGroup(
    groupId: string,
    userId: string,
    updates: Partial<IGroup>
  ): Promise<FormattedGroup> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    // Check if user is admin (creator or has admin role)
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!group.createdBy.equals(userObjectId)) {
      throw new Error("Only group admin can update group details");
    }

    // Update allowed fields
    const allowedUpdates = ["name", "description", "category", "tags", "isPublic", "avatar"];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) && updates[key as keyof IGroup] !== undefined) {
        (group as any)[key] = updates[key as keyof IGroup];
      }
    });

    group.lastActivity = new Date();
    await group.save();
    await group.populate("createdBy", "name");

    logger.info(`Group ${groupId} updated by ${userId}`);

    return {
      id: group._id.toString(),
      name: group.name,
      description: group.description || "",
      category: group.category || "general",
      memberCount: group.members?.length || 0,
      isPublic: group.isPublic ?? true,
      isJoined: true, // User must be admin to update, so they're definitely joined
      lastActivity: group.lastActivity.toISOString(),
      avatar: group.avatar || null,
      tags: group.tags || [],
      createdBy: (group.createdBy as any).name,
      createdAt: group.createdAt.toISOString()
    };
  }

  /**
   * Delete a group (only creator or system admin)
   */
  async deleteGroup(
    groupId: string,
    requesterId: string,
    isAdmin = false
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    if (!isAdmin && group.createdBy.toString() !== requesterId) {
      throw new Error("Not authorized");
    }

    // Delete associated messages
    await GroupMessage.deleteMany({ groupId: new mongoose.Types.ObjectId(groupId) });

    await group.deleteOne();
    logger.info(`Group ${groupId} deleted by ${requesterId}`);
  }

  /**
   * List groups the user has joined
   */
  async getMyGroups(userId: string): Promise<FormattedGroup[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const groups = await Group.find({ members: userObjectId })
      .populate("createdBy", "name")
      .sort({ lastActivity: -1 })
      .lean();

    return groups.map(group => ({
      id: group._id.toString(),
      name: group.name,
      description: group.description || "",
      category: group.category || "general",
      memberCount: group.members?.length || 0,
      isPublic: group.isPublic ?? true,
      isJoined: true,
      lastActivity: group.lastActivity?.toISOString() || group.createdAt.toISOString(),
      avatar: group.avatar || null,
      tags: group.tags || [],
      createdBy: (group.createdBy as any)?.name || "Unknown",
      createdAt: group.createdAt.toISOString()
    }));
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string, userId: string): Promise<FormattedMember[]> {
    const group = await Group.findById(groupId)
      .populate("members", "name email profilePicture lastActive")
      .populate("createdBy", "_id");

    if (!group) throw new Error("Group not found");

    // Check if user is a member
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!group.members.some((member: any) => member._id.equals(userObjectId))) {
      throw new Error("Not authorized to view members");
    }

    return (group.members as any[]).map(member => ({
      id: member._id.toString(),
      name: member.name,
      email: member.email,
      profilePicture: member.profilePicture || null,
      role: member._id.equals(group.createdBy._id) ? "admin" : "member",
      joinedAt: member.createdAt?.toISOString() || new Date().toISOString(),
      isOnline: member.lastActive ? (Date.now() - new Date(member.lastActive).getTime() < 5 * 60 * 1000) : false
    }));
  }

  /**
   * Get group messages (simplified - no pagination)
   */
  async getGroupMessages(
    groupId: string,
    userId: string
  ): Promise<IGroupMessage[]> {
    // Check if user is a member
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!group.members.some(member => member.equals(userObjectId))) {
      throw new Error("Not authorized to view messages");
    }

    const messages = await GroupMessage.find({ groupId: new mongoose.Types.ObjectId(groupId) })
      .populate("senderId", "name profilePicture")
      .sort({ createdAt: -1 })
      .limit(50) // Default limit
      .lean();

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Send group message
   */
  async sendGroupMessage(
    groupId: string,
    userId: string,
    content: string,
    io: Server
  ): Promise<IGroupMessage> {
    // Check if user is a member
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!group.members.some(member => member.equals(userObjectId))) {
      throw new Error("Not authorized to send messages");
    }

    const message = await GroupMessage.create({
      groupId: new mongoose.Types.ObjectId(groupId),
      senderId: userObjectId,
      content: content.trim(),
      timestamp: new Date()
    });

    await message.populate("senderId", "name profilePicture");

    // Update group's last activity
    group.lastActivity = new Date();
    await group.save();

    // Emit to group room
    io.in(groupId).emit("newGroupMessage", {
      id: message._id.toString(),
      senderId: userId,
      senderName: (message.senderId as any).name,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      type: "message"
    });

    logger.info(`Message sent to group ${groupId} by ${userId}`);

    return message;
  }

  /**
   * Invite a member to group
   */
  async inviteMember(
    groupId: string,
    inviteeId: string,
    inviterId: string,
    io: Server
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    // Check if inviter is a member
    const inviterObjectId = new mongoose.Types.ObjectId(inviterId);
    if (!group.members.some(member => member.equals(inviterObjectId))) {
      throw new Error("Not authorized to invite members");
    }

    // Check if invitee is already a member
    const inviteeObjectId = new mongoose.Types.ObjectId(inviteeId);
    if (group.members.some(member => member.equals(inviteeObjectId))) {
      throw new Error("User is already a member");
    }

    const notification = await Notification.create({
      user: inviteeId,
      message: `You've been invited to join group "${group.name}"`,
      type: "invitation",
      read: false,
      link: `/groups/${groupId}`,
    });

    // Emit to the user room
    io.to(inviteeId).emit("groupInvitation", {
      groupId,
      message: notification.message,
    });

    logger.info(`Invitation for group ${groupId} sent to ${inviteeId} by ${inviterId}`);
  }

  /**
   * Remove a member from group (admin only)
   */
  async removeMember(
    groupId: string,
    memberToRemove: string,
    adminId: string,
    io: Server
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    // Check if requester is admin
    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    if (!group.createdBy.equals(adminObjectId)) {
      throw new Error("Only group admin can remove members");
    }

    // Check if member exists
    const memberObjectId = new mongoose.Types.ObjectId(memberToRemove);
    if (!group.members.some(member => member.equals(memberObjectId))) {
      throw new Error("User is not a member of this group");
    }

    // Cannot remove the group creator
    if (group.createdBy.equals(memberObjectId)) {
      throw new Error("Cannot remove group creator");
    }

    group.members = group.members.filter(member => !member.equals(memberObjectId));
    group.lastActivity = new Date();
    await group.save();

    // Notify the group
    io.in(groupId).emit("memberRemoved", { userId: memberToRemove });

    logger.info(`Member ${memberToRemove} removed from group ${groupId} by ${adminId}`);
  }

  /**
   * Legacy: Invite to group (keeping for backward compatibility)
   */
  async inviteToGroup(
    groupId: string,
    userId: string,
    io: Server
  ): Promise<void> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    const notification = await Notification.create({
      user: userId,
      message: `You've been invited to join group "${group.name}"`,
      type: "invitation",
      read: false,
      link: `/groups/${groupId}`,
    });

    // Emit to the user room
    io.to(userId).emit("groupInvitation", {
      groupId,
      message: notification.message,
    });

    logger.info(`Invitation for group ${groupId} sent to ${userId}`);
  }
}

export default new GroupService();
