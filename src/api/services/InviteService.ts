// src/api/services/InviteService.ts
import { Types } from "mongoose";
import Group from "../models/Group";
import GroupInvitation, { IInvitation } from "../models/Invitation";
import NotificationService from "./NotificationService";
import { logger } from "../../utils/winstonLogger";
import { createError } from "../middleware/errorHandler";

export default class InviteService {
  /**
   * Send a group invitation
   */
  static async sendInvitation(
    senderId: string,
    recipientId: string,
    groupId: string
  ): Promise<IInvitation> {
    // Validate IDs
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(recipientId) ||
      !Types.ObjectId.isValid(groupId)
    ) {
      throw createError("Invalid IDs provided", 400);
    }

    // Make sure the group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw createError("Group not found", 404);
    }

    // Prevent inviting someone who’s already in the group
    if (group.members.some((m) => m.equals(recipientId))) {
      throw createError("User is already a member of this group", 400);
    }

    // Prevent duplicate pending invitations
    const existing = await GroupInvitation.findOne({
      groupId,
      recipient: recipientId,
      status: "pending",
    });
    if (existing) {
      throw createError("An invitation is already pending", 400);
    }

    // Create the invitation
    const invitation = await GroupInvitation.create({
      groupId,
      sender: senderId,
      recipient: recipientId,
      status: "pending",
      createdAt: new Date(),
    });

    // Send an in-app notification (senderId, receiverId, message)
    await NotificationService.sendInAppNotification(
      senderId,
      recipientId,
      `${senderId} has invited you to join the group "${group.name}".`
    );

    logger.info(
      `Group invitation ${invitation._id} sent by ${senderId} to ${recipientId}`
    );
    return invitation;
  }

  /**
   * Accept a pending invitation
   */
  static async acceptInvitation(
    userId: string,
    invitationId: string
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(invitationId)
    ) {
      throw createError("Invalid IDs provided", 400);
    }

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation || invitation.recipient.toString() !== userId) {
      throw createError("Invitation not found or access denied", 404);
    }
    if (invitation.status !== "pending") {
      throw createError("Invitation is not pending", 400);
    }

    // Mark accepted
    invitation.status = "accepted";
    await invitation.save();

    // Add the user to the group
    const group = await Group.findById(invitation.groupId);
    if (!group) {
      throw createError("Group not found", 404);
    }
    group.members.push(new Types.ObjectId(userId));
    await group.save();

    // Notify both parties
    await NotificationService.sendInAppNotification(
      userId,
      invitation.sender.toString(),
      `${userId} accepted your invitation to join "${group.name}".`
    );
    await NotificationService.sendInAppNotification(
      invitation.sender.toString(),
      userId,
      `You have joined the group "${group.name}".`
    );

    logger.info(`Invitation ${invitationId} accepted by ${userId}`);
  }

  /**
   * Reject a pending invitation
   */
  static async rejectInvitation(
    userId: string,
    invitationId: string
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(invitationId)
    ) {
      throw createError("Invalid IDs provided", 400);
    }

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation || invitation.recipient.toString() !== userId) {
      throw createError("Invitation not found or access denied", 404);
    }
    if (invitation.status !== "pending") {
      throw createError("Invitation is not pending", 400);
    }

    invitation.status = "rejected";
    await invitation.save();

    // Notify the sender
    await NotificationService.sendInAppNotification(
      userId,
      invitation.sender.toString(),
      `${userId} has rejected your invitation to join group "${invitation.groupId}".`
    );

    logger.info(`Invitation ${invitationId} rejected by ${userId}`);
  }

  /**
   * Cancel (withdraw) an invitation
   */
  static async cancelInvitation(
    senderId: string,
    invitationId: string
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(invitationId)
    ) {
      throw createError("Invalid IDs provided", 400);
    }

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation || invitation.sender.toString() !== senderId) {
      throw createError("Invitation not found or access denied", 404);
    }
    if (invitation.status !== "pending") {
      throw createError("Cannot cancel a non-pending invitation", 400);
    }

    await invitation.deleteOne();

    // Notify the recipient
    await NotificationService.sendInAppNotification(
      senderId,
      invitation.recipient.toString(),
      `Your invitation to join group "${invitation.groupId}" has been canceled.`
    );

    logger.info(`Invitation ${invitationId} canceled by ${senderId}`);
  }
}
