import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as chatController from "../controllers/chatController";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests from this IP, please try again later.",
});

router.use(chatLimiter);

/**
 * @swagger
 * /api/chat/send:
 *   post:
 *     summary: Send a message in a group chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, chatId]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hello group!"
 *               chatId:
 *                 type: string
 *                 example: "642fcfd02fd8f3b1c13a3e88"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error or bad request
 */
router.post(
  "/send",
  protect,
  [
    check("message", "Message is required").notEmpty(),
    check("chatId", "Invalid chat ID").isMongoId(),
    handleValidationErrors,
  ],
  chatController.editMessage
);

/**
 * @swagger
 * /api/chat/private/{friendId}:
 *   post:
 *     summary: Send a private message to a friend
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ID of the friend to message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hey, how’s your goal going?"
 *     responses:
 *       200:
 *         description: Private message sent successfully
 *       400:
 *         description: Validation failed
 */
router.post(
  "/private/:friendId",
  protect,
  [check("message", "Message cannot be empty").notEmpty(), handleValidationErrors],
  chatController.sendPrivateMessage
);

/**
 * @swagger
 * /api/chat/private/{friendId}:
 *   get:
 *     summary: Get private chat history with a friend
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ID of the friend
 *     responses:
 *       200:
 *         description: Retrieved chat history
 *       404:
 *         description: Chat not found
 */
router.get(
  "/private/:friendId",
  protect,
  chatController.getPrivateChats
);

export default router;
