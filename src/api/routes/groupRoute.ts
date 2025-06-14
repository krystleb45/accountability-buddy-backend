// src/api/routes/groupRoute.ts - WITH GROUP MIDDLEWARE
import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import * as groupController from "../controllers/groupController";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  checkGroupExists,
  checkGroupMembership,
  checkGroupAdmin,
  checkGroupAccess,
  checkCanJoinGroup,
  checkCanLeaveGroup,
} from "../middleware/groupMiddleware";

const router = Router();
const groupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many group requests"
});

// GET /api/groups - Get all groups (no middleware needed - public listing)
router.get(
  "/",
  protect,
  groupController.getGroups
);

// POST /api/groups - Create new group
router.post(
  "/",
  protect,
  checkSubscription("paid"),
  groupLimiter,
  [
    check("name", "Group name is required").notEmpty(),
    check("name", "Group name must be between 3 and 50 characters").isLength({ min: 3, max: 50 }),
    check("description", "Description is required").notEmpty(),
    check("description", "Description must be between 10 and 200 characters").isLength({ min: 10, max: 200 }),
    check("category", "Category is required").notEmpty(),
    check("category", "Invalid category").isIn(["fitness", "study", "career", "lifestyle", "creative", "tech"]),
    check("tags", "Tags must be an array").optional().isArray(),
    check("tags.*", "Each tag must be a string").optional().isString(),
    check("isPublic", "isPublic must be a boolean").optional().isBoolean(),
    check("inviteOnly", "inviteOnly must be a boolean").optional().isBoolean(),
  ],
  handleValidationErrors,
  groupController.createGroup
);

// GET /api/groups/my-groups - Get user's joined groups (no middleware needed)
router.get(
  "/my-groups",
  protect,
  groupController.getMyGroups
);

// GET /api/groups/:groupId - Get specific group details
router.get(
  "/:groupId",
  protect,
  checkGroupExists,      // ✅ Check group exists
  checkGroupAccess,      // ✅ Check public or member access
  groupController.getGroupDetails
);

// POST /api/groups/:groupId/join - Join a group
router.post(
  "/:groupId/join",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkCanJoinGroup,     // ✅ Check if user can join
  groupController.joinGroup
);

// POST /api/groups/:groupId/leave - Leave a group
router.post(
  "/:groupId/leave",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkCanLeaveGroup,    // ✅ Check if user can leave
  groupController.leaveGroup
);

// PUT /api/groups/:groupId - Update group (admin only)
router.put(
  "/:groupId",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkGroupAdmin,       // ✅ Check admin permissions
  [
    check("name", "Group name must be between 3 and 50 characters").optional().isLength({ min: 3, max: 50 }),
    check("description", "Description must be between 10 and 200 characters").optional().isLength({ min: 10, max: 200 }),
    check("category", "Invalid category").optional().isIn(["fitness", "study", "career", "lifestyle", "creative", "tech"]),
    check("tags", "Tags must be an array").optional().isArray(),
    check("isPublic", "isPublic must be a boolean").optional().isBoolean(),
  ],
  handleValidationErrors,
  groupController.updateGroup
);

// DELETE /api/groups/:groupId - Delete group (admin only)
router.delete(
  "/:groupId",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkGroupAdmin,       // ✅ Check admin permissions
  groupController.deleteGroup
);

// GET /api/groups/:groupId/members - Get group members (members only)
router.get(
  "/:groupId/members",
  protect,
  checkGroupExists,      // ✅ Check group exists
  checkGroupMembership,  // ✅ Check user is member
  groupController.getGroupMembers
);

// POST /api/groups/:groupId/invite - Invite user to group (admin only)
router.post(
  "/:groupId/invite",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkGroupAdmin,       // ✅ Check admin permissions
  [
    check("userId", "User ID is required").notEmpty(),
    check("userId", "Invalid user ID").isMongoId(),
  ],
  handleValidationErrors,
  groupController.inviteMember
);

// DELETE /api/groups/:groupId/remove/:userId - Remove member (admin only)
router.delete(
  "/:groupId/remove/:userId",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkGroupAdmin,       // ✅ Check admin permissions
  groupController.removeMember
);

// GET /api/groups/:groupId/messages - Get group messages (members only)
router.get(
  "/:groupId/messages",
  protect,
  checkGroupExists,      // ✅ Check group exists
  checkGroupMembership,  // ✅ Check user is member
  groupController.getGroupMessages
);

// POST /api/groups/:groupId/messages - Send group message (members only)
router.post(
  "/:groupId/messages",
  protect,
  groupLimiter,
  checkGroupExists,      // ✅ Check group exists
  checkGroupMembership,  // ✅ Check user is member
  [
    check("content", "Message content is required").notEmpty(),
    check("content", "Message too long").isLength({ max: 1000 }),
  ],
  handleValidationErrors,
  groupController.sendGroupMessage
);

export default router;
