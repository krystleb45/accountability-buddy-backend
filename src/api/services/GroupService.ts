import mongoose from "mongoose";
import Group, { IGroup } from "../models/Group";
import Notification from "../models/Notification";
import { logger } from "../../utils/winstonLogger";
import { Socket } from "socket.io";

/**
 * Service to handle group-related operations.
 */
class GroupService {
  /**
   * @desc Invite a user to join a group
   * @param groupId - ID of the group
   * @param userId - ID of the user to be invited
   * @param socket - The user's WebSocket connection
   * @returns A promise that resolves to the notification status
   */
  async inviteToGroup(groupId: string, userId: string, socket: Socket): Promise<void> {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error("Group not found");
      }

      // Send an invitation notification
      const notification = new Notification({
        user: userId,
        message: `You've been invited to join the group ${group.name}`,
        type: "invitation",
        read: false,
        link: `/groups/${group._id}`,
      });

      await notification.save();

      // Notify the user via WebSocket
      socket.emit("groupInvitation", {
        groupId: group._id.toString(),
        message: notification.message,
      });

      logger.info(`Invitation sent to user ${userId} for group ${group.name}`);
    } catch (error: unknown) {
      logger.error(`Error sending group invitation: ${(error as Error).message}`);
    }
  }

  /**
   * @desc Join a group
   * @param groupId - ID of the group
   * @param userId - ID of the user joining the group
   * @returns A promise that resolves to the updated group and user info
   */
  async joinGroup(groupId: string, userId: string): Promise<IGroup> {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Convert userId to ObjectId for comparison and addition to group
    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (group.members.some((id) => id.equals(userObjectId))) {
      throw new Error("You are already a member of this group");
    }

    group.members.push(userObjectId);
    await group.save();

    logger.info(`User ${userId} joined group ${group.name}`);
    return group;
  }

  /**
   * @desc Leave a group
   * @param groupId - ID of the group
   * @param userId - ID of the user leaving the group
   * @param socket - The user's WebSocket connection to remove from the room
   * @returns A promise that resolves to the updated group info
   */
  async leaveGroup(groupId: string, userId: string, socket: Socket): Promise<IGroup> {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Convert userId to ObjectId for comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Remove the user from the group members list
    group.members = group.members.filter((member) => !member.equals(userObjectId));
    await group.save();

    // Remove the user from the WebSocket room
    void socket.leave(groupId);  // Marking it as ignored

    logger.info(`User ${userId} left group ${group.name}`);


    // Notify remaining group members via WebSocket
    socket.to(groupId).emit("userLeft", { userId });

    return group;
  }

  /**
   * @desc Update unread messages count for group members
   * @param groupId - ID of the group
   * @param userId - ID of the user
   * @param unreadCount - The number of unread messages
   * @returns A promise that resolves to the updated group info
   */
  async updateUnreadMessagesCount(groupId: string, userId: string, unreadCount: number): Promise<IGroup> {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Update unread message count for the user
    const memberIndex = group.unreadMessages.findIndex((entry) =>
      entry.userId.equals(new mongoose.Types.ObjectId(userId)) // Convert userId to ObjectId here
    );
    if (memberIndex !== -1) {
      group.unreadMessages[memberIndex].count = unreadCount;
    } else {
      group.unreadMessages.push({
        userId: new mongoose.Types.ObjectId(userId), // Ensure userId is stored as ObjectId
        count: unreadCount,
      });
    }
      

    await group.save();

    logger.info(`Updated unread message count for user ${userId} in group ${group.name}`);
    return group;
  }

  /**
   * @desc Handle group notifications for members
   * @param groupId - ID of the group
   * @param userId - ID of the user receiving the notification
   * @param message - The notification message
   * @returns A promise that resolves to the created notification
   */
  async sendGroupNotification(groupId: string, userId: string, message: string): Promise<void> {
    try {
      const notification = new Notification({
        user: userId,
        message: message,
        type: "info",
        read: false,
        link: `/groups/${groupId}`,
      });

      await notification.save();

      logger.info(`Group notification sent to user ${userId} for group ${groupId}`);
    } catch (error: unknown) {
      logger.error(`Error sending notification for group ${groupId}: ${(error as Error).message}`);
    }
  }
}

// Export the GroupService class for use in controllers
export default new GroupService();
