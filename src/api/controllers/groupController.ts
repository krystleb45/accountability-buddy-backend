// src/api/controllers/groupController.ts - SIMPLIFIED with middleware
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import GroupService from "../services/GroupService";

/**
 * GET /api/groups - Get all groups with optional filters
 */
export const getGroups = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { category, search } = req.query;
  const userId = req.user!.id;

  const groups = await GroupService.getGroups(
    userId,
    category as string,
    search as string
  );

  sendResponse(res, 200, true, "Groups retrieved successfully", groups);
});

/**
 * POST /api/groups - Create new group
 */
export const createGroup = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { name, description, category } = req.body;
  const creatorId = req.user!.id;

  const group = await GroupService.createGroup(
    name,
    description,
    category,
    creatorId
  );

  sendResponse(res, 201, true, "Group created successfully", group);
});

/**
 * GET /api/groups/my-groups - Get user's joined groups
 */
export const getMyGroups = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const userId = req.user!.id;
  const groups = await GroupService.getMyGroups(userId);
  sendResponse(res, 200, true, "Your groups retrieved successfully", groups);
});

/**
 * GET /api/groups/:groupId - Get specific group details
 * Middleware: checkGroupExists, checkGroupAccess
 */
export const getGroupDetails = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  // Group existence already verified by middleware
  const group = await GroupService.getGroupDetails(groupId, userId);
  sendResponse(res, 200, true, "Group details retrieved successfully", group);
});

/**
 * POST /api/groups/:groupId/join - Join a group
 * Middleware: checkGroupExists, checkCanJoinGroup
 */
export const joinGroup = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  // Group existence and join eligibility already verified by middleware
  await GroupService.joinGroup(groupId, userId, global.io);
  sendResponse(res, 200, true, "Joined group successfully");
});

/**
 * POST /api/groups/:groupId/leave - Leave a group
 * Middleware: checkGroupExists, checkCanLeaveGroup
 */
export const leaveGroup = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  // Group existence and leave eligibility already verified by middleware
  await GroupService.leaveGroup(groupId, userId, global.io);
  sendResponse(res, 200, true, "Left group successfully");
});

/**
 * PUT /api/groups/:groupId - Update group (admin only)
 * Middleware: checkGroupExists, checkGroupAdmin
 */
export const updateGroup = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;
  const updates = req.body;

  // Group existence and admin status already verified by middleware
  const group = await GroupService.updateGroup(groupId, userId, updates);
  sendResponse(res, 200, true, "Group updated successfully", group);
});

/**
 * DELETE /api/groups/:groupId - Delete group (admin only)
 * Middleware: checkGroupExists, checkGroupAdmin
 */
export const deleteGroup = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";

  // Group existence and admin status already verified by middleware
  await GroupService.deleteGroup(groupId, userId, isAdmin);
  sendResponse(res, 200, true, "Group deleted successfully");
});

/**
 * GET /api/groups/:groupId/members - Get group members
 * Middleware: checkGroupExists, checkGroupMembership
 */
export const getGroupMembers = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  // Group existence and membership already verified by middleware
  const members = await GroupService.getGroupMembers(groupId, userId);
  sendResponse(res, 200, true, "Group members retrieved successfully", members);
});

/**
 * POST /api/groups/:groupId/invite - Invite user to group
 * Middleware: checkGroupExists, checkGroupAdmin
 */
export const inviteMember = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const { userId: inviteeId } = req.body;
  const inviterId = req.user!.id;

  // Group existence and admin status already verified by middleware
  await GroupService.inviteMember(groupId, inviteeId, inviterId, global.io);
  sendResponse(res, 200, true, "Invitation sent successfully");
});

/**
 * DELETE /api/groups/:groupId/remove/:userId - Remove member from group
 * Middleware: checkGroupExists, checkGroupAdmin
 */
export const removeMember = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId, userId: memberToRemove } = req.params;
  const adminId = req.user!.id;

  // Group existence and admin status already verified by middleware
  await GroupService.removeMember(groupId, memberToRemove, adminId, global.io);
  sendResponse(res, 200, true, "Member removed successfully");
});

/**
 * GET /api/groups/:groupId/messages - Get group messages
 * Middleware: checkGroupExists, checkGroupMembership
 */
export const getGroupMessages = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  // Group existence and membership already verified by middleware
  const messages = await GroupService.getGroupMessages(groupId, userId);
  sendResponse(res, 200, true, "Group messages retrieved successfully", messages);
});

/**
 * POST /api/groups/:groupId/messages - Send group message
 * Middleware: checkGroupExists, checkGroupMembership
 */
export const sendGroupMessage = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const { groupId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  // Group existence and membership already verified by middleware
  const message = await GroupService.sendGroupMessage(groupId, userId, content, global.io);
  sendResponse(res, 201, true, "Message sent successfully", message);
});

// Export object for default import
export default {
  getGroups,
  createGroup,
  getMyGroups,
  getGroupDetails,
  joinGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  inviteMember,
  removeMember,
  getGroupMessages,
  sendGroupMessage,
};
