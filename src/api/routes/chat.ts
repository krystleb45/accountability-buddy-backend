// src/api/routes/chat.ts
import { Router, Request, Response, NextFunction } from "express";
import { check, param } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as chatController from "../controllers/chatController";

const router = Router();

// Throttle to 60 requests per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
});
router.use(chatLimiter);

/**
 * POST /api/chat/send
 * Send a message in a group chat
 */
router.post(
  "/send",
  protect,
  [
    check("message", "Message is required").notEmpty(),
    check("chatId", "Invalid chat ID").isMongoId(),
    handleValidationErrors,
  ],
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await chatController.editMessage(req, res, next);
  })
);

/**
 * POST /api/chat/private/:friendId
 * Send a private message to a friend
 */
router.post(
  "/private/:friendId",
  protect,
  [
    param("friendId", "Invalid friend ID").isMongoId(),
    check("message", "Message cannot be empty").notEmpty(),
    handleValidationErrors,
  ],
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await chatController.sendPrivateMessage(req, res, next);
  })
);

/**
 * GET /api/chat/private/:friendId
 * Get private chat history with a friend
 */
router.get(
  "/private/:friendId",
  protect,
  [ param("friendId", "Invalid friend ID").isMongoId(), handleValidationErrors ],
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await chatController.getPrivateChats(req, res, next);
  })
);

export default router;
