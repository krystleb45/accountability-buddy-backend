import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Group from "../models/g";
import Invitation from "../models/Invitation"; // Assuming you have an Invitation model
import NotificationService from "../services/NotificationService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

// Function to send a group invitation
export const sendGroupInvitation = catchAsync(async (
  req: Request<{ groupId: string }, {}, { recipientId: string }>,
  res: Response
): Promise<void> => {
  const { groupId } = req.params;
  const { recipientId } = req.body;
  const senderId = req.user?.id;

  if (!senderId || !recipientId || !groupId) {
    sendResponse(res, 400, false, "Sender, recipient, and group ID are required.");
    return;
  }

  // Ensure group exists
  const group = await Group.findById(groupId);
  if (!group) {
    sendResponse(res, 404, false, "Group not found.");
    return;
  }

  // Check if the user is already a member of the group
  if (group.members.includes(new Types.ObjectId(recipientId))) {
    sendResponse(res, 400, false, "User is already a member of the group.");
    return;
  }

  // Check if an invitation already exists
  const existingInvitation = await Invitation.findOne({
    groupId,
    recipient: new Types.ObjectId(recipientId),
    status: "pending", // Only check for pending invitations
  });

  if (existingInvitation) {
    sendResponse(res, 400, false, "Invitation already exists.");
    return;
  }

  // Create a new invitation
  const invitation = await Invitation.create({
    groupId,
    sender: senderId,
    recipient: recipientId,
    status: "pending", // Invitation is pending until accepted or rejected
  });

  // Notify the recipient about the invitation
  await NotificationService.sendInAppNotification(recipientId, `${senderId} has invited you to join the group.`);

  sendResponse(res, 201, true, "Invitation sent successfully.", {
    invitation: invitation.toObject(), // Optionally return the invitation object
  });
});

// Function to accept a group invitation
export const acceptGroupInvitation = catchAsync(
  async (req: Request<{ groupId: string }, {}, { invitationId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { invitationId } = req.body;
    const userId = req.user?.id;

    if (!userId || !invitationId || !groupId) {
      sendResponse(res, 400, false, "User, invitation, and group IDs are required.");
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found.");
      return;
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.recipient.toString() !== userId) {
      sendResponse(res, 400, false, "Invalid invitation or unauthorized action.");
      return;
    }

    // Update the invitation status to accepted
    invitation.status = "accepted";
    await invitation.save();

    // Add the user to the group members list
    group.members.push(new mongoose.Types.ObjectId(userId));    await group.save();

    // Send notifications
    await NotificationService.sendInAppNotification(
      userId,
      `You have accepted the invitation to join the group: ${group.name}`
    );
    await NotificationService.sendInAppNotification(
      group.createdBy.toString(),
      `${userId} has accepted your invitation to the group: ${group.name}`
    );

    sendResponse(res, 200, true, "Invitation accepted successfully.");
  }
);

// Function to reject a group invitation
export const rejectGroupInvitation = catchAsync(
  async (req: Request<{ groupId: string }, {}, { invitationId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { invitationId } = req.body;
    const userId = req.user?.id;

    if (!userId || !invitationId || !groupId) {
      sendResponse(res, 400, false, "User, invitation, and group IDs are required.");
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found.");
      return;
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.recipient.toString() !== userId) {
      sendResponse(res, 400, false, "Invalid invitation or unauthorized action.");
      return;
    }

    // Update the invitation status to rejected
    invitation.status = "rejected";
    await invitation.save();

    // Send rejection notification to the sender
    await NotificationService.sendInAppNotification(
      invitation.sender.toString(),
      `${userId} has rejected your invitation to the group: ${group.name}`
    );

    sendResponse(res, 200, true, "Invitation rejected successfully.");
  }
);
