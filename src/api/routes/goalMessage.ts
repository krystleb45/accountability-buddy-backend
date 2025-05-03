// src/api/routes/goalMessage.ts
import { Router } from "express";
import { param, check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import goalMessageController from "../controllers/GoalMessageController";

const router = Router();

// throttle to 30 messages per minute
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many messages sent, please try again later." },
});

/**
 * POST /api/goal-message/:goalId/send
 * Create a new message for a specific goal
 */
router.post(
  "/:goalId/send",
  protect,
  messageLimiter,
  [
    param("goalId", "Invalid goal ID").isMongoId(),
    check("message", "Message is required").notEmpty(),
    check("message", "Message must not exceed 500 characters").isLength({ max: 500 }),
  ],
  handleValidationErrors,
  goalMessageController.createGoalMessage
);

/**
 * GET /api/goal-message/:goalId/messages
 * Retrieve all messages for a specific goal
 */
router.get(
  "/:goalId/messages",
  protect,
  [ param("goalId", "Invalid goal ID").isMongoId() ],
  handleValidationErrors,
  goalMessageController.getGoalMessages
);

export default router;
