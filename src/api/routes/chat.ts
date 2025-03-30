import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as chatController from "../controllers/chatController";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = Router();

// ✅ Rate limiter to prevent spam
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests from this IP, please try again later.",
});

router.use(chatLimiter);

/**
 * @route   POST /chat/send
 * @desc    Send a message in a group chat
 * @access  Private
 */
router.post(
  "/send",
  protect,
  [
    check("message", "Message is required").notEmpty(),
    check("chatId", "Invalid chat ID").isMongoId(),
    handleValidationErrors,
  ],
  chatController.editMessage // ✅ Using function reference instead of async
);

/**
 * @route   POST /chat/private/:friendId
 * @desc    Send a private message
 * @access  Private
 */
router.post(
  "/private/:friendId",
  protect,
  [check("message", "Message cannot be empty").notEmpty(), handleValidationErrors],
  chatController.sendPrivateMessage
);

/**
 * @route   GET /chat/private/:friendId
 * @desc    Get private chat history
 * @access  Private
 */
router.get(
  "/private/:friendId",
  protect,
  chatController.getPrivateChats
);

export default router;
