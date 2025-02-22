import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as chatController from "../controllers/chatController";
import authMiddleware from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = Router();

// ✅ Rate limiter to prevent spam
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max requests per minute
  message: "Too many requests from this IP, please try again later.",
});

router.use(chatLimiter);

/**
 * @route   POST /chat/send
 * @desc    Send a message in a chat (group or private)
 * @access  Private
 */
router.post(
  "/send",
  authMiddleware,
  [
    check("message", "Message is required").notEmpty(),
    check("chatId", "Invalid chat ID").isMongoId(),
    handleValidationErrors,
  ],
  chatController.sendMessage
);

/**
 * @route   POST /chat/private/:friendId
 * @desc    Send a private message to a user
 * @access  Private
 */
router.post(
  "/private/:friendId",
  authMiddleware,
  [check("message", "Message cannot be empty").notEmpty(), handleValidationErrors],
  chatController.sendPrivateMessage
);

/**
 * @route   GET /chat/private/:friendId
 * @desc    Retrieve private chat history
 * @access  Private
 */
router.get(
  "/private/:friendId",
  authMiddleware,
  chatController.getPrivateChats
);

/**
 * @route   GET /chat/history/:chatId
 * @desc    Retrieve full chat history (private or group)
 * @access  Private
 */
router.get(
  "/history/:chatId",
  authMiddleware,
  chatController.getChatHistory
);

/**
 * @route   POST /chat/message/:messageId/edit
 * @desc    Edit a message
 * @access  Private
 */
router.post(
  "/message/:messageId/edit",
  authMiddleware,
  [
    check("newText", "New message text cannot be empty").notEmpty(),
    handleValidationErrors,
  ],
  chatController.editMessage
);

/**
 * @route   DELETE /chat/message/:messageId/delete
 * @desc    Soft delete a message (Marks as 'deleted')
 * @access  Private
 */
router.delete(
  "/message/:messageId/delete",
  authMiddleware,
  chatController.deleteMessage
);

/**
 * @route   POST /chat/message/:messageId/reaction
 * @desc    React to a message
 * @access  Private
 */
router.post(
  "/message/:messageId/reaction",
  authMiddleware,
  [
    check("reaction", "Reaction must be an emoji").notEmpty(),
    handleValidationErrors,
  ],
  chatController.addReaction
);

export default router;
