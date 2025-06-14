// src/api/middleware/groupMiddleware.ts
import { Request, Response, NextFunction } from "express";
import Group from "../models/Group";
import catchAsync from "../utils/catchAsync";
import mongoose from "mongoose";

// Extend Request interface to include group data
declare global {
  namespace Express {
    interface Request {
      group?: any; // Will store the group document
      isGroupMember?: boolean;
      isGroupAdmin?: boolean;
    }
  }
}

/**
 * Check if group exists and attach to req.group
 */
export const checkGroupExists = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { groupId } = req.params;

  if (!groupId) {
    res.status(400).json({
      success: false,
      message: "Group ID is required"
    });
    return;
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    res.status(400).json({
      success: false,
      message: "Invalid group ID format"
    });
    return;
  }

  const group = await Group.findById(groupId)
    .populate("createdBy", "name email")
    .populate("members", "name email");

  if (!group) {
    res.status(404).json({
      success: false,
      message: "Group not found"
    });
    return;
  }

  if (!group.isActive) {
    res.status(410).json({
      success: false,
      message: "Group is no longer active"
    });
    return;
  }

  // Attach group to request for use in controllers
  req.group = group;
  next();
});

/**
 * Check if user is a member of the group
 */
export const checkGroupMembership = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const group = req.group;

  if (!group) {
    res.status(500).json({
      success: false,
      message: "Group data not found. Make sure checkGroupExists middleware runs first."
    });
    return;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isMember = group.members.some((member: any) => member._id.equals(userObjectId));

  if (!isMember) {
    res.status(403).json({
      success: false,
      message: "Access denied. You must be a member of this group."
    });
    return;
  }

  // Attach membership status to request
  req.isGroupMember = true;
  next();
});

/**
 * Check if user is an admin of the group
 */
export const checkGroupAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const group = req.group;
  const userRole = req.user!.role;

  if (!group) {
    res.status(500).json({
      success: false,
      message: "Group data not found. Make sure checkGroupExists middleware runs first."
    });
    return;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Check if user is the group creator (admin)
  const isGroupCreator = group.createdBy._id.equals(userObjectId);

  // Check if user is a system admin
  const isSystemAdmin = userRole === "admin";

  if (!isGroupCreator && !isSystemAdmin) {
    res.status(403).json({
      success: false,
      message: "Access denied. Only group admins can perform this action."
    });
    return;
  }

  // Attach admin status to request
  req.isGroupAdmin = true;
  next();
});

/**
 * Check if group is public or user has access to private group
 */
export const checkGroupAccess = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const group = req.group;

  if (!group) {
    res.status(500).json({
      success: false,
      message: "Group data not found. Make sure checkGroupExists middleware runs first."
    });
    return;
  }

  // Public groups are accessible to everyone
  if (group.isPublic) {
    next();
    return;
  }

  // Private groups require membership
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isMember = group.members.some((member: any) => member._id.equals(userObjectId));

  if (!isMember) {
    res.status(403).json({
      success: false,
      message: "Access denied. This is a private group."
    });
    return;
  }

  next();
});

/**
 * Check if user can join the group
 */
export const checkCanJoinGroup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const group = req.group;

  if (!group) {
    res.status(500).json({
      success: false,
      message: "Group data not found. Make sure checkGroupExists middleware runs first."
    });
    return;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Check if already a member
  const isAlreadyMember = group.members.some((member: any) => member._id.equals(userObjectId));
  if (isAlreadyMember) {
    res.status(400).json({
      success: false,
      message: "You are already a member of this group"
    });
    return;
  }

  // Check if group is invite-only
  if (!group.isPublic && group.inviteOnly) {
    // TODO: Check for pending invitation
    // For now, we'll allow it if the group exists
    // You can implement invitation checking here later
  }

  next();
});

/**
 * Check if user can leave the group
 */
export const checkCanLeaveGroup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const group = req.group;

  if (!group) {
    res.status(500).json({
      success: false,
      message: "Group data not found. Make sure checkGroupExists middleware runs first."
    });
    return;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Check if user is a member
  const isMember = group.members.some((member: any) => member._id.equals(userObjectId));
  if (!isMember) {
    res.status(400).json({
      success: false,
      message: "You are not a member of this group"
    });
    return;
  }

  // Check if user is the only admin/creator
  const isCreator = group.createdBy._id.equals(userObjectId);
  if (isCreator && group.members.length === 1) {
    res.status(400).json({
      success: false,
      message: "Cannot leave group as the only member. Delete the group instead."
    });
    return;
  }

  next();
});

export default {
  checkGroupExists,
  checkGroupMembership,
  checkGroupAdmin,
  checkGroupAccess,
  checkCanJoinGroup,
  checkCanLeaveGroup,
};
