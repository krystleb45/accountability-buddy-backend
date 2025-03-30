import GroupInvitation from "../models/GroupInvitation";
import Group from "../models/Group";
import NotificationService from "./NotificationService";
import { logger } from "../../utils/winstonLogger";
import mongoose from "mongoose";

// Function to send a group invitation
const sendGroupInvitation = async (
  senderId: string,
  recipientId: string,
  groupId: string
): Promise<void> => {
  // Check if the user is already a member of the group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error("Group not found");
  }

  if (group.members.includes(new mongoose.Types.ObjectId(recipientId))) {
    throw new Error("The user is already a member of the group");
  }

  // Check if there is already an invitation
  const existingInvitation = await GroupInvitation.findOne({
    groupId,
    recipient: recipientId,
    status: "pending",
  });

  if (existingInvitation) {
    throw new Error("An invitation is already pending");
  }

  // Create a new group invitation
  const invitation = await GroupInvitation.create({
    groupId,
    sender: senderId,
    recipient: recipientId,
    status: "pending",
  });
  
  // Log or use the invitation object
  console.warn(`Invitation sent: ${invitation._id}`);

  
  // Send notification to the recipient
  await NotificationService.sendInAppNotification(
    recipientId,
    `${senderId} has invited you to join the group ${group?.name}`
  );

  logger.info(`Group invitation sent from ${senderId} to ${recipientId} for group ${groupId}`);
};

// Function to accept a group invitation
const acceptGroupInvitation = async (
  invitationId: string,
  userId: string
): Promise<void> => {
  const invitation = await GroupInvitation.findById(invitationId);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.recipient.toString() !== userId) {
    throw new Error("Unauthorized to accept this invitation");
  }

  // Update invitation status to accepted
  invitation.status = "accepted";
  await invitation.save();

  // Add the user to the group
  const group = await Group.findById(invitation.groupId);
  if (!group) {
    throw new Error("Group not found");
  }

  // Convert userId to ObjectId
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Add the user to the group's members array
  group.members.push(userObjectId);
  await group.save();


  // Send notification to the sender and recipient
  await NotificationService.sendInAppNotification(
    invitation.sender.toString(),
    `${userId} has accepted your group invitation`
  );

  await NotificationService.sendInAppNotification(
    userId,
    `You have joined the group ${group?.name}`
  );

  logger.info(`User ${userId} accepted the group invitation for group ${invitation.groupId}`);
};

// Function to reject a group invitation
const rejectGroupInvitation = async (
  invitationId: string,
  userId: string
): Promise<void> => {
  const invitation = await GroupInvitation.findById(invitationId);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.recipient.toString() !== userId) {
    throw new Error("Unauthorized to reject this invitation");
  }

  // Update invitation status to rejected
  invitation.status = "rejected";
  await invitation.save();

  // Send notification to the sender
  await NotificationService.sendInAppNotification(
    invitation.sender.toString(),
    `${userId} has rejected your group invitation`
  );

  logger.info(`User ${userId} rejected the group invitation for group ${invitation.groupId}`);
};

// Function to cancel a group invitation
const cancelGroupInvitation = async (
  invitationId: string,
  senderId: string
): Promise<void> => {
  const invitation = await GroupInvitation.findById(invitationId);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.sender.toString() !== senderId) {
    throw new Error("Unauthorized to cancel this invitation");
  }

  // Delete the invitation
  await invitation.deleteOne();

  // Send cancellation notification to the recipient
  await NotificationService.sendInAppNotification(
    invitation.recipient.toString(),
    `The group invitation for ${invitation.groupId} has been canceled`
  );

  logger.info(`Group invitation canceled by ${senderId} for group ${invitation.groupId}`);
};

export default {
  sendGroupInvitation,
  acceptGroupInvitation,
  rejectGroupInvitation,
  cancelGroupInvitation,
};
