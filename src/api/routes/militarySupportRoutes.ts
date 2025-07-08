// src/api/routes/militarySupportRoutes.ts 
import { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import { protect, militaryAuth } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as militarySupportController from "../controllers/militarySupportController";

const router = Router();

/**
 * GET /api/military-support/resources
 * Get external military support resources (PUBLIC - no auth required)
 * These are crisis resources that should be available to everyone
 */
router.get(
  "/resources",
  // REMOVED: protect, militaryAuth - now public for crisis support
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await militarySupportController.getResources(req, res, next);
  })
);

/**
 * GET /api/military-support/disclaimer
 * Get military support disclaimer (PUBLIC - no auth required)
 */
router.get(
  "/disclaimer",
  // Already public - no auth middleware
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await militarySupportController.getDisclaimer(req, res, next);
  })
);

// ========================================
// AUTHENTICATED ROUTES (for members with accounts)
// ========================================

/**
 * POST /api/military-support/chat/send
 * Send a message in military support chatroom (military members only)
 */
router.post(
  "/chat/send",
  protect,
  militaryAuth,
  [
    check("chatroomId", "chatroomId is required and must be a valid ID").isMongoId(),
    check("message", "Message text is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await militarySupportController.sendMessage(req, res, next);
  })
);

/**
 * GET /api/military-support/chatrooms
 * Get military support chatrooms (military members only)
 */
router.get(
  "/chatrooms",
  protect,
  militaryAuth,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await militarySupportController.getChatrooms(req, res, next);
  })
);

/**
 * POST /api/military-support/chatrooms
 * Create a military chatroom (military members only)
 */
router.post(
  "/chatrooms",
  protect,
  militaryAuth,
  [
    check("name", "Chatroom name is required").notEmpty(),
    check("topic", "Chatroom topic is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await militarySupportController.createChatroom(req, res, next);
  })
);

export default router;
