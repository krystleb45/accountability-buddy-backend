import express from "express";
import {
  sendMessage,
  getResources,
  getDisclaimer,
  getChatrooms,
  createChatroom,
} from "../controllers/militarySupportController";
import { protect, militaryAuth } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * /api/military-support/resources:
 *   get:
 *     summary: Get external military support resources
 *     tags: [Military Support]
 *     security:
 *       - bearerAuth: []
 *     description: Fetches links and descriptions of external military support resources.
 *     responses:
 *       200:
 *         description: List of resources returned successfully.
 *       401:
 *         description: Unauthorized (if not military authenticated).
 */
router.get("/resources", protect, militaryAuth, getResources);

/**
 * @swagger
 * /api/military-support/disclaimer:
 *   get:
 *     summary: Get military support disclaimer
 *     tags: [Military Support]
 *     description: Returns a disclaimer about the nature of military peer support and liability limitations.
 *     responses:
 *       200:
 *         description: Disclaimer message returned.
 */
router.get("/disclaimer", getDisclaimer);

/**
 * @swagger
 * /api/military-support/chat/send:
 *   post:
 *     summary: Send a message in military support chatroom
 *     tags: [Military Support]
 *     security:
 *       - bearerAuth: []
 *     description: Sends a message to an active military chatroom.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "We’ve got your six. Stay strong!"
 *               chatroomId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully.
 *       401:
 *         description: Unauthorized access.
 */
router.post("/chat/send", protect, militaryAuth, sendMessage);

/**
 * @swagger
 * /api/military-support/chatrooms:
 *   get:
 *     summary: Get military support chatrooms
 *     tags: [Military Support]
 *     security:
 *       - bearerAuth: []
 *     description: Returns a list of military peer support chatrooms.
 *     responses:
 *       200:
 *         description: List of chatrooms returned.
 *       401:
 *         description: Unauthorized access.
 */
router.get("/chatrooms", protect, militaryAuth, getChatrooms);

/**
 * @swagger
 * /api/military-support/chatrooms:
 *   post:
 *     summary: Create a military chatroom
 *     tags: [Military Support]
 *     security:
 *       - bearerAuth: []
 *     description: Allows authenticated military users to create a new chatroom.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Veteran Mental Health"
 *               topic:
 *                 type: string
 *                 example: "Open support thread for PTSD discussion"
 *     responses:
 *       201:
 *         description: Chatroom created successfully.
 *       401:
 *         description: Unauthorized access.
 */
router.post("/chatrooms", protect, militaryAuth, createChatroom);

export default router;
