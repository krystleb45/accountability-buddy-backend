// src/api/routes/messages.ts
import { Router, Request, Response, NextFunction } from "express";
import { param, check, query } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as MessageController from "../controllers/MessageController";

const router = Router();
/**
 * GET /api/messages
 * Get messages based on query parameters:
 * - No params: return conversation threads
 * - recipientId: return messages with specific user
 * - groupId: return messages in specific group
 */
router.get(
  "/",
  protect,
  [
    query("recipientId").optional().isMongoId().withMessage("Invalid recipient ID"),
    query("groupId").optional().isMongoId().withMessage("Invalid group ID"),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessages(req, res, next);
  })
);
/**
 * GET /api/messages/threads
 * Get all conversation threads for the authenticated user
 */
router.get(
  "/threads",
  protect,
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    query("messageType").optional().isIn(["private", "group"]), // Changed from "direct" to "private"
    query("search").optional().isString(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessageThreads(req, res, next);
  })
);

/**
 * GET /api/messages/threads/:threadId/messages
 * Get messages in a specific thread (paginated)
 */
router.get(
  "/threads/:threadId/messages",
  protect,
  [
    param("threadId", "Invalid thread ID").isMongoId(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    query("before").optional().isISO8601(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessagesInThread(req, res, next);
  })
);

/**
 * POST /api/messages/threads/:threadId/mark-read
 * Mark all messages in a thread as read
 */
router.post(
  "/threads/:threadId/mark-read",
  protect,
  param("threadId", "Invalid thread ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.markThreadAsRead(req, res, next);
  })
);

/**
 * GET /api/messages/recent
 * Get recent messages for dashboard
 */
router.get(
  "/recent",
  protect,
  [
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getRecentMessages(req, res, next);
  })
);

/**
 * GET /api/messages/unread-count
 * Get unread message count for the authenticated user
 */
router.get(
  "/unread-count",
  protect,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getUnreadCount(req, res, next);
  })
);

/**
 * GET /api/messages/stats
 * Get message statistics for the authenticated user
 */
router.get(
  "/stats",
  protect,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessageStats(req, res, next);
  })
);

/**
 * POST /api/messages
 * Send a new message (updated to support both private and group messages)
 */
router.post(
  "/",
  protect,
  [
    check("content", "Message content is required").notEmpty(),
    check("messageType", "Message type must be 'private' or 'group'").isIn(["private", "group"]), // Changed from "direct" to "private"
    // Either recipientId (for private) or groupId (for group) is required
    check().custom((_value, { req }) => {
      const { messageType, recipientId, groupId } = req.body;
      if (messageType === "private" && !recipientId) { // Changed from "direct" to "private"
        throw new Error("recipientId is required for private messages");
      }
      if (messageType === "group" && !groupId) {
        throw new Error("groupId is required for group messages");
      }
      if (recipientId && !require("mongoose").Types.ObjectId.isValid(recipientId)) {
        throw new Error("Invalid recipientId");
      }
      if (groupId && !require("mongoose").Types.ObjectId.isValid(groupId)) {
        throw new Error("Invalid groupId");
      }
      return true;
    }),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.sendMessage(req, res, next);
  })
);

/**
 * GET /api/messages/:messageId
 * Get a specific message by ID
 */
router.get(
  "/:messageId",
  protect,
  param("messageId", "Invalid message ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessageById(req, res, next);
  })
);

/**
 * PUT /api/messages/:messageId
 * Edit a message
 */
router.put(
  "/:messageId",
  protect,
  [
    param("messageId", "Invalid message ID").isMongoId(),
    check("content", "Message content is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.editMessage(req, res, next);
  })
);

/**
 * DELETE /api/messages/:messageId
 * Delete a message
 */
router.delete(
  "/:messageId",
  protect,
  param("messageId", "Invalid message ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.deleteMessage(req, res, next);
  })
);

/**
 * POST /api/messages/:messageId/reactions
 * Add a reaction to a message
 */
router.post(
  "/:messageId/reactions",
  protect,
  [
    param("messageId", "Invalid message ID").isMongoId(),
    check("emoji", "Emoji is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.addReaction(req, res, next);
  })
);

/**
 * DELETE /api/messages/:messageId/reactions/:emoji
 * Remove a reaction from a message
 */
router.delete(
  "/:messageId/reactions/:emoji",
  protect,
  [
    param("messageId", "Invalid message ID").isMongoId(),
    param("emoji", "Emoji is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.removeReaction(req, res, next);
  })
);

/**
 * POST /api/messages/mark-read
 * Mark multiple messages as read
 */
router.post(
  "/mark-read",
  protect,
  [
    check("messageIds", "Message IDs array is required").isArray(),
    check("messageIds.*", "Invalid message ID").isMongoId(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.markMultipleMessagesAsRead(req, res, next);
  })
);

/**
 * GET /api/messages/search
 * Search messages
 */
router.get(
  "/search",
  protect,
  [
    query("search", "Search query is required").notEmpty(),
    query("messageType").optional().isIn(["private", "group"]), // Changed from "direct" to "private"
    query("recipientId").optional().isMongoId(),
    query("groupId").optional().isMongoId(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.searchMessages(req, res, next);
  })
);

// Legacy routes (keep for backward compatibility)
/**
 * GET /api/messages/:userId
 * Get conversation with a specific user (paginated) - LEGACY
 */
router.get(
  "/:userId",
  protect,
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessagesWithUser(req, res, next);
  })
);

/**
 * PATCH /api/messages/:userId/read
 * Mark all messages from a user as read - LEGACY
 */
router.patch(
  "/:userId/read",
  protect,
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.markMessagesAsRead(req, res, next);
  })
);

export default router;
