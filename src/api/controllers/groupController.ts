// src/api/controllers/groupController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import GroupService from "../services/GroupService";

/**
 * POST /api/group/create
 */
export const createGroup = catchAsync(async (req: Request, res: Response) => {
  const { name, interests, inviteOnly } = req.body;
  const creatorId = req.user!.id;

  const group = await GroupService.createGroup(
    name,
    interests,
    inviteOnly,
    creatorId
  );

  sendResponse(res, 201, true, "Group created successfully", { group });
});

/**
 * POST /api/group/join
 */
export const joinGroup = catchAsync(async (req: Request, res: Response) => {
  const { groupId } = req.body;
  const userId = req.user!.id;

  const group = await GroupService.joinGroup(groupId, userId, global.io);
  sendResponse(res, 200, true, "Joined group successfully", { group });
});

/**
 * POST /api/group/leave
 */
export const leaveGroup = catchAsync(async (req: Request, res: Response) => {
  const { groupId } = req.body;
  const userId = req.user!.id;

  const group = await GroupService.leaveGroup(groupId, userId, global.io);
  sendResponse(res, 200, true, "Left group successfully", { group });
});

/**
 * GET /api/group/my-groups
 */
export const getMyGroups = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const groups = await GroupService.getMyGroups(userId);
  sendResponse(res, 200, true, "Your groups retrieved successfully", { groups });
});

/**
 * DELETE /api/group/:groupId
 */
export const deleteGroup = catchAsync(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";

  await GroupService.deleteGroup(groupId, userId, isAdmin);
  sendResponse(res, 200, true, "Group deleted successfully");
});

/**
 * POST /api/group/invite
 * Body: { groupId, userId }
 */
export const inviteToGroup = catchAsync(async (req: Request, res: Response) => {
  const { groupId, userId } = req.body;

  await GroupService.inviteToGroup(groupId, userId, global.io);
  sendResponse(res, 200, true, "Invitation sent successfully");
});

export default {
  createGroup,
  joinGroup,
  leaveGroup,
  getMyGroups,
  deleteGroup,
  inviteToGroup,
};
