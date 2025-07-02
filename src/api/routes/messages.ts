// src/api/routes/messages.ts - Updated with subscription restrictions
import { Router, Request, Response, NextFunction } from "express";
import { param, check, query } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import { validateSubscription, validateFeatureAccess } from "../middleware/subscriptionValidation";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as MessageController from "../controllers/MessageController";

const router = Router();

/**
 * GET /api/messages
 * Get messages based on query parameters:
 * - No params: return conversation threads
 * - recipientId: return messages with specific user (requires Pro+ for private messages)
 * - groupId: return messages in specific group (all plans)
 */
router.get(
  "/",
  protect,
  validateSubscription,
  [
    query("recipientId").optional().isMongoId().withMessage("Invalid recipient ID"),
    query("groupId").optional().isMongoId().withMessage("Invalid group ID"),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  // Add middleware to check if querying private messages
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // If querying private messages (recipientId), check DM access
    if (req.query.recipientId) {
      return validateFeatureAccess("dmMessaging")(req, res, next);
    }
    next();
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessages(req, res, next);
  })
);

/**
 * GET /api/messages/threads
 * Get all conversation threads for the authenticated user
 * Private threads require Pro+ plan
 */
router.get(
  "/threads",
  protect,
  validateSubscription,
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    query("messageType").optional().isIn(["private", "group"]),
    query("search").optional().isString(),
  ],
  handleValidationErrors,
  // Check if requesting private threads
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.query.messageType === "private") {
      return validateFeatureAccess("dmMessaging")(req, res, next);
    }
    next();
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessageThreads(req, res, next);
  })
);

/**
 * GET /api/messages/threads/:threadId/messages
 * Get messages in a specific thread (paginated)
 * Will check thread type in controller
 */
router.get(
  "/threads/:threadId/messages",
  protect,
  validateSubscription,
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
  validateSubscription,
  param("threadId", "Invalid thread ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.markThreadAsRead(req, res, next);
  })
);

/**
 * GET /api/messages/recent
 * Get recent messages for dashboard (all plans)
 */
router.get(
  "/recent",
  protect,
  validateSubscription,
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
 * Get unread message count for the authenticated user (all plans)
 */
router.get(
  "/unread-count",
  protect,
  validateSubscription,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getUnreadCount(req, res, next);
  })
);

/**
 * GET /api/messages/stats
 * Get message statistics for the authenticated user (all plans)
 */
router.get(
  "/stats",
  protect,
  validateSubscription,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessageStats(req, res, next);
  })
);

/**
 * POST /api/messages
 * Send a new message (updated to support both private and group messages)
 * Private messages require Pro+ plan
 */
router.post(
  "/",
  protect,
  validateSubscription,
  [
    check("content", "Message content is required").notEmpty(),
    check("messageType", "Message type must be 'private' or 'group'").isIn(["private", "group"]),
    // Either recipientId (for private) or groupId (for group) is required
    check().custom((_value, { req }) => {
      const { messageType, recipientId, groupId } = req.body;
      if (messageType === "private" && !recipientId) {
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
  // Check if sending private message
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.body.messageType === "private") {
      return validateFeatureAccess("dmMessaging")(req, res, next);
    }
    next();
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.sendMessage(req, res, next);
  })
);

/**
 * GET /api/messages/:messageId
 * Get a specific message by ID (all plans)
 */
router.get(
  "/:messageId",
  protect,
  validateSubscription,
  param("messageId", "Invalid message ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessageById(req, res, next);
  })
);

/**
 * PUT /api/messages/:messageId
 * Edit a message (all plans)
 */
router.put(
  "/:messageId",
  protect,
  validateSubscription,
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
 * Delete a message (all plans)
 */
router.delete(
  "/:messageId",
  protect,
  validateSubscription,
  param("messageId", "Invalid message ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.deleteMessage(req, res, next);
  })
);

/**
 * POST /api/messages/:messageId/reactions
 * Add a reaction to a message (all plans)
 */
router.post(
  "/:messageId/reactions",
  protect,
  validateSubscription,
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
 * Remove a reaction from a message (all plans)
 */
router.delete(
  "/:messageId/reactions/:emoji",
  protect,
  validateSubscription,
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
 * Mark multiple messages as read (all plans)
 */
router.post(
  "/mark-read",
  protect,
  validateSubscription,
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
 * Private message search requires Pro+ plan
 */
router.get(
  "/search",
  protect,
  validateSubscription,
  [
    query("search", "Search query is required").notEmpty(),
    query("messageType").optional().isIn(["private", "group"]),
    query("recipientId").optional().isMongoId(),
    query("groupId").optional().isMongoId(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  // Check if searching private messages
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.query.messageType === "private" || req.query.recipientId) {
      return validateFeatureAccess("dmMessaging")(req, res, next);
    }
    next();
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.searchMessages(req, res, next);
  })
);

// Legacy routes (keep for backward compatibility)
/**
 * GET /api/messages/:userId
 * Get conversation with a specific user (paginated) - LEGACY
 * Requires Pro+ plan for private conversations
 */
router.get(
  "/:userId",
  protect,
  validateSubscription,
  validateFeatureAccess("dmMessaging"), // Private conversations require Pro+
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.getMessagesWithUser(req, res, next);
  })
);

/**
 * PATCH /api/messages/:userId/read
 * Mark all messages from a user as read - LEGACY
 * Requires Pro+ plan for private conversations
 */
router.patch(
  "/:userId/read",
  protect,
  validateSubscription,
  validateFeatureAccess("dmMessaging"), // Private conversations require Pro+
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.markMessagesAsRead(req, res, next);
  })
);

export default router;
