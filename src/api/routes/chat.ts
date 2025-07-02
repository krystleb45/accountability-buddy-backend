// src/api/routes/chat.ts - Updated with subscription restrictions
import { Router, Request, Response, NextFunction } from "express";
import { check, param } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { validateSubscription, validateFeatureAccess } from "../middleware/subscriptionValidation";
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
 * Send a message in a group chat (all plans)
 */
router.post(
  "/send",
  protect,
  validateSubscription, // Basic subscription required for group chat
  [
    check("message", "Message is required").notEmpty(),
    check("chatId", "Invalid chat ID").isMongoId(),
    handleValidationErrors,
  ],
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await chatController.sendMessage(req, res, next); // Fixed: was editMessage, now sendMessage
  })
);

/**
 * POST /api/chat/private/:friendId
 * Send a private message to a friend (Pro+ plans only)
 */
router.post(
  "/private/:friendId",
  protect,
  validateSubscription,
  validateFeatureAccess("dmMessaging"), // Pro+ plan required for private messaging
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
 * Get private chat history with a friend (Pro+ plans only)
 */
router.get(
  "/private/:friendId",
  protect,
  validateSubscription,
  validateFeatureAccess("dmMessaging"), // Pro+ plan required for private messaging
  [ param("friendId", "Invalid friend ID").isMongoId(), handleValidationErrors ],
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await chatController.getPrivateChats(req, res, next);
  })
);

/**
 * POST /api/chat/rooms/create
 * Create a new chat room
 */
router.post(
  "/rooms/create",
  protect,
  validateSubscription,
  [
    check("name", "Room name is required").notEmpty(),
    check("description").optional().isString(),
    check("isPrivate").optional().isBoolean(),
    check("maxMembers").optional().isInt({ min: 2, max: 1000 }),
    handleValidationErrors,
  ],
  // Check if creating private room (Elite plan only)
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.body.isPrivate === true) {
      return validateFeatureAccess("privateRooms")(req, res, next);
    }
    next();
  }),
  catchAsync(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Add your room creation controller here
    res.status(501).json({ success: false, message: "Room creation not implemented yet" });
  })
);

/**
 * GET /api/chat/rooms
 * Get available chat rooms (all plans)
 */
router.get(
  "/rooms",
  protect,
  validateSubscription,
  catchAsync(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Add your get rooms controller here
    res.status(501).json({ success: false, message: "Get rooms not implemented yet" });
  })
);

/**
 * POST /api/chat/rooms/:roomId/join
 * Join a chat room
 */
router.post(
  "/rooms/:roomId/join",
  protect,
  validateSubscription,
  [
    param("roomId", "Invalid room ID").isMongoId(),
    handleValidationErrors,
  ],
  catchAsync(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // You would check in the controller if the room is private and validate accordingly
    // For now, allowing all subscribed users to join
    res.status(501).json({ success: false, message: "Join room not implemented yet" });
  })
);

/**
 * POST /api/chat/rooms/:roomId/leave
 * Leave a chat room (all plans)
 */
router.post(
  "/rooms/:roomId/leave",
  protect,
  validateSubscription,
  [
    param("roomId", "Invalid room ID").isMongoId(),
    handleValidationErrors,
  ],
  catchAsync(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    res.status(501).json({ success: false, message: "Leave room not implemented yet" });
  })
);

/**
 * GET /api/chat/rooms/:roomId/messages
 * Get messages in a chat room
 */
router.get(
  "/rooms/:roomId/messages",
  protect,
  validateSubscription,
  [
    param("roomId", "Invalid room ID").isMongoId(),
    handleValidationErrors,
  ],
  catchAsync(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Controller should check if room is private and validate subscription accordingly
    res.status(501).json({ success: false, message: "Get room messages not implemented yet" });
  })
);

/**
 * POST /api/chat/rooms/:roomId/messages
 * Send a message to a chat room
 */
router.post(
  "/rooms/:roomId/messages",
  protect,
  validateSubscription,
  [
    param("roomId", "Invalid room ID").isMongoId(),
    check("message", "Message is required").notEmpty(),
    handleValidationErrors,
  ],
  catchAsync(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Controller should check if room is private and validate subscription accordingly
    res.status(501).json({ success: false, message: "Send room message not implemented yet" });
  })
);

export default router;
