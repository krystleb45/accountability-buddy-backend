import type { Request, Response } from "express";
import mongoose from "mongoose";
import Group from "../models/Group";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * @desc Create a new group
 * @route POST /api/groups
 * @access Private
 */
export const createGroup = catchAsync(
  async (
    req: Request<{}, any, { name: string; members: string[] }>,
    res: Response,
  ): Promise<void> => {
    const { name, members } = req.body;
    const userId = req.user?.id;

    if (!name || !name.trim()) {
      throw createError("Group name is required", 400);
    }

    const uniqueMembers = [...new Set([userId, ...members])].map(
      (id) => new mongoose.Types.ObjectId(String(id)),
    );

    const newGroup = new Group({
      name,
      members: uniqueMembers,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await newGroup.save();

    sendResponse(res, 201, true, "Group created successfully", { group: newGroup });
  },
);

/**
 * @desc Get all groups a user is part of
 * @route GET /api/groups
 * @access Private
 */
export const getUserGroups = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Use explicit types
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;

    const groups = await Group.find({
      members: new mongoose.Types.ObjectId(userId),
    })
      .populate("members", "username profilePicture")
      .populate("createdBy", "username profilePicture");

    sendResponse(res, 200, true, "User groups fetched successfully", { groups });
  },
);


/**
 * @desc Join a group
 * @route POST /api/groups/join
 * @access Private
 */
export const joinGroup = catchAsync(
  async (
    req: Request<{}, any, { groupId: string }>,
    res: Response,
  ): Promise<void> => {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group = await Group.findById(groupId);
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

    sendResponse(res, 200, true, "Joined the group successfully", { group });
  },
);

/**
 * @desc Leave a group
 * @route POST /api/groups/leave
 * @access Private
 */
export const leaveGroup = catchAsync(
  async (
    req: Request<{}, any, { groupId: string }>,
    res: Response,
  ): Promise<void> => {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    // Remove the user from the group members
    group.members = group.members.filter(
      (member) => !member.equals(new mongoose.Types.ObjectId(userId)),
    );

    await group.save();

    sendResponse(res, 200, true, "Left the group successfully", { group });
  },
);

/**
 * @desc Get a specific group by ID
 * @route GET /api/groups/:groupId
 * @access Private
 */
export const getGroupById = catchAsync(
  async (
    req: Request<{ groupId: string }>,
    res: Response,
  ): Promise<void> => {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group = await Group.findById(new mongoose.Types.ObjectId(groupId))
      .populate("members", "username profilePicture")
      .populate("createdBy", "username profilePicture");

    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    sendResponse(res, 200, true, "Group fetched successfully", { group });
  },
);

/**
 * @desc Delete a group
 * @route DELETE /api/groups/:groupId
 * @access Private
 */
export const deleteGroup = catchAsync(
  async (
    req: Request<{ groupId: string }>,
    res: Response,
  ): Promise<void> => {
    const { groupId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID format", 400);
    }

    const group = await Group.findById(new mongoose.Types.ObjectId(groupId));
    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }
    if (!group.createdBy.equals(new mongoose.Types.ObjectId(userId))) {
      sendResponse(res, 403, false, "You are not authorized to delete this group");
      return;
    }

    await group.deleteOne();
    sendResponse(res, 200, true, "Group deleted successfully");
  },
);
