import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Group, { IGroup } from "../models/Group";
import Notification from "../models/Notification"; // ✅ Import Notification model
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

// ✅ Extend request type for user authentication
interface RequestWithUser<T = {}, U = {}> extends Request<U, {}, T> {
  user?: {
    id: string;
    email?: string;
    role: "user" | "admin" | "moderator";
    isAdmin?: boolean;
    subscription_status?: "trial" | "active" | "expired";
  };
}

/**
 * @desc Create a new group
 * @route POST /api/groups
 * @access Private
 */
export const createGroup = catchAsync(
  async (
    req: RequestWithUser<{ name: string; members: string[] }>,
    res: Response
  ): Promise<void> => {
    const { name, members } = req.body;
    const userId = req.user?.id;

    if (!name || !name.trim()) {
      throw createError("Group name is required", 400);
    }

    const uniqueMembers = [...new Set([userId, ...members])].map(
      (id) => new mongoose.Types.ObjectId(String(id))
    );

    const newGroup: IGroup = await Group.create({
      name,
      members: uniqueMembers,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    // ✅ Notify members they have been added to the group
    const notifications = uniqueMembers.map((memberId) => ({
      user: memberId,
      message: `You have been added to the group: ${name}`,
      type: "info",
      read: false,
      link: `/groups/${newGroup._id.toHexString()}`,
    }));
    await Notification.insertMany(notifications);

    sendResponse(res, 201, true, "Group created successfully", {
      group: { ...newGroup.toObject(), _id: newGroup._id.toHexString() },
    });
  }
);

/**
 * @desc Get user groups
 * @route GET /api/groups/my-groups
 * @access Private
 */
export const getUserGroups = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const groups = await Group.find({ members: userId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "User groups fetched successfully", { groups });
  }
);

/**
 * @desc Join a group
 * @route POST /api/groups/join
 * @access Private
 */
export const joinGroup = catchAsync(
  async (req: RequestWithUser<{ groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group: IGroup | null = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (group.members.some((id) => id.equals(userObjectId))) {
      sendResponse(res, 400, false, "You are already a member of this group");
      return;
    }

    group.members.push(userObjectId);
    await group.save();

    // ✅ Notify group members that someone joined
    const notifications = group.members.map((memberId) => ({
      user: memberId,
      message: `${userId} has joined the group: ${group.name}`,
      type: "info",
      read: false,
      link: `/groups/${group._id.toHexString()}`,
    }));
    await Notification.insertMany(notifications);

    sendResponse(res, 200, true, "Joined the group successfully", {
      group: { ...group.toObject(), _id: group._id.toHexString() },
    });
  }
);

/**
 * @desc Leave a group
 * @route POST /api/groups/leave
 * @access Private
 */
export const leaveGroup = catchAsync(
  async (req: RequestWithUser<{ groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group: IGroup | null = await Group.findById(groupId);

    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    group.members = group.members.filter(
      (member) => !member.equals(new mongoose.Types.ObjectId(userId))
    );

    await group.save();

    // ✅ Notify group members that someone left
    const notifications = group.members.map((memberId) => ({
      user: memberId,
      message: `${userId} has left the group: ${group.name}`,
      type: "warning",
      read: false,
      link: `/groups/${group._id.toHexString()}`,
    }));
    await Notification.insertMany(notifications);

    sendResponse(res, 200, true, "Left the group successfully", {
      group: { ...group.toObject(), _id: group._id.toHexString() },
    });
  }
);

/**
 * @desc Delete a group
 * @route DELETE /api/groups/:groupId
 * @access Private
 */
export const deleteGroup = catchAsync(
  async (req: RequestWithUser<{ groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.params as { groupId: string };
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group: IGroup | null = await Group.findById(groupId);

    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    if (!group.createdBy.equals(new mongoose.Types.ObjectId(userId))) {
      sendResponse(res, 403, false, "You are not authorized to delete this group");
      return;
    }

    await group.deleteOne();

    // ✅ Notify all group members that the group was deleted
    const notifications = group.members.map((memberId) => ({
      user: memberId,
      message: `The group "${group.name}" has been deleted.`,
      type: "alert",
      read: false,
      link: "/groups",
    }));
    await Notification.insertMany(notifications);

    sendResponse(res, 200, true, "Group deleted successfully");
  }
);

// ✅ Export all controllers properly
export default {
  createGroup,
  getUserGroups,
  joinGroup,
  leaveGroup,
  deleteGroup,
};
