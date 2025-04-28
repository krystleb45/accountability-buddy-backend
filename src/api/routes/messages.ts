import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as MessageController from "../controllers/MessageController";

const router = Router();

// Send a new message
router.post(
  "/",
  protect,
  MessageController.sendMessage
);

// Get conversation with a specific user (paginated)
router.get(
  "/:userId",
  protect,
  MessageController.getMessagesWithUser
);

// Delete a message
router.delete(
  "/:messageId",
  protect,
  MessageController.deleteMessage
);

// Mark all messages from a user as read
router.patch(
  "/:userId/read",
  protect,
  MessageController.markMessagesAsRead
);

export default router;
