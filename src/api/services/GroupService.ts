// src/api/services/GroupService.ts
import mongoose from "mongoose";
import { Server } from "socket.io";
import Group, { IGroup } from "../models/Group";
import Notification from "../models/Notification";
import { logger } from "../../utils/winstonLogger";

class GroupService {
  /**
   * Create a new group.
   */
  async createGroup(
    name: string,
    interests: string[],
    inviteOnly: boolean,
    creatorId: string
  ): Promise<IGroup> {
    const group = await Group.create({
      name,
      interests,
      inviteOnly,
      createdBy: new mongoose.Types.ObjectId(creatorId),
      members: [new mongoose.Types.ObjectId(creatorId)],
      unreadMessages: [],
    });
    logger.info(`Group ${group._id} created by ${creatorId}`);
    return group;
  }

  /**
   * Add a member to a group.
   */
  async joinGroup(
    groupId: string,
    userId: string,
    io: Server
  ): Promise<IGroup> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    const uid = new mongoose.Types.ObjectId(userId);
    if (group.members.some(m => m.equals(uid))) {
      throw new Error("Already a member");
    }

    group.members.push(uid);
    await group.save();

    // notify everyone in the group room that someone joined
    io.in(groupId).emit("userJoined", { userId });

    logger.info(`User ${userId} joined group ${groupId}`);
    return group;
  }

  /**
   * Remove a member from a group.
   */
  async leaveGroup(
    groupId: string,
    userId: string,
    io: Server
  ): Promise<IGroup> {
    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");

    const uid = new mongoose.Types.ObjectId(userId);
    group.members = group.members.filter(m => !m.equals(uid));
    await group.save();

    // broadcast to the group room
    io.in(groupId).emit("userLeft", { userId });

    logger.info(`User ${userId} left group ${groupId}`);
    return group;
  }

  /**
   * Delete a group (only creator or admin).
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

    await group.deleteOne();
    logger.info(`Group ${groupId} deleted by ${requesterId}`);
  }

  /**
   * List groups the user has joined.
   */
  async getMyGroups(userId: string): Promise<IGroup[]> {
    return Group.find({ members: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Invite a user (in-app notification + real‐time via server).
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

    // emit to the user‐room
    io.to(userId).emit("groupInvitation", {
      groupId,
      message: notification.message,
    });

    logger.info(`Invitation for group ${groupId} sent to ${userId}`);
  }
}

export default new GroupService();
