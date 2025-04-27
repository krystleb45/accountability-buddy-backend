// src/api/controllers/groupController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Group from "../models/Group"; // make sure this points at your group model

/**
 * @desc Create a new group
 * @route POST /group/create
 * @access Private
 */
export const createGroup = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { name, interests, inviteOnly } = req.body;
    const createdBy = req.user!.id;

    const group = await Group.create({
      name,
      interests,
      inviteOnly,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    sendResponse(res, 201, true, "Group created successfully", { group });
  }
);

/**
 * @desc Join an existing group
 * @route POST /group/join
 * @access Private
 */
export const joinGroup = catchAsync(
  async (req: Request<{}, {}, { groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.body;
    const userId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      sendResponse(res, 400, false, "Invalid group ID");
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    await group.addMember(new mongoose.Types.ObjectId(userId));
    sendResponse(res, 200, true, "Joined group successfully", { group });
  }
);

/**
 * @desc Leave a group
 * @route POST /group/leave
 * @access Private
 */
export const leaveGroup = catchAsync(
  async (req: Request<{}, {}, { groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.body;
    const userId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      sendResponse(res, 400, false, "Invalid group ID");
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    await group.removeMember(new mongoose.Types.ObjectId(userId));
    sendResponse(res, 200, true, "Left group successfully", { group });
  }
);

/**
 * @desc Get all groups the logged-in user has joined
 * @route GET /group/my-groups
 * @access Private
 */
export const getMyGroups = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const userId = _req.user!.id;
    const groups = await Group.find({ members: userId }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, "Your groups retrieved successfully", { groups });
  }
);

/**
 * @desc Delete a group (only creator or admin)
 * @route DELETE /group/:groupId
 * @access Private/Admin or Creator
 */
export const deleteGroup = catchAsync(
  async (req: Request<{ groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const userId = req.user!.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      sendResponse(res, 400, false, "Invalid group ID");
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      sendResponse(res, 404, false, "Group not found");
      return;
    }

    // Only creator or admin can delete
    if (
      group.createdBy.toString() !== userId &&
      req.user!.role !== "admin"
    ) {
      sendResponse(res, 403, false, "Not authorized to delete this group");
      return;
    }

    await group.deleteOne();
    sendResponse(res, 200, true, "Group deleted successfully");
  }
);

export default {
  createGroup,
  joinGroup,
  leaveGroup,
  getMyGroups,
  deleteGroup,
};
