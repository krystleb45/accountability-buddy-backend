// src/api/routes/messages.ts
import { Router, Request, Response, NextFunction } from "express";
import { param, check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as MessageController from "../controllers/MessageController";

const router = Router();

/**
 * POST /api/messages
 * Send a new message
 */
router.post(
  "/",
  protect,
  [
    check("recipientId", "Recipient ID is required").isMongoId(),
    check("content", "Message content is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await MessageController.sendMessage(req, res, next);
  })
);

/**
 * GET /api/messages/:userId
 * Get conversation with a specific user (paginated)
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
 * PATCH /api/messages/:userId/read
 * Mark all messages from a user as read
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
