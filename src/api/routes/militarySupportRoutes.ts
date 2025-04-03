// src/api/routes/militarySupportRoutes.ts
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
 * @route   GET /api/military-support/resources
 * @desc    Fetch external military support resources
 * @access  Private (Military only)
 */
router.get("/resources", protect, militaryAuth, getResources);

/**
 * @route   GET /api/military-support/disclaimer
 * @desc    Return disclaimer for support section
 * @access  Public
 */
router.get("/disclaimer", getDisclaimer);

/**
 * @route   POST /api/military-support/chat/send
 * @desc    Send message in military chatroom
 * @access  Private (Military only)
 */
router.post("/chat/send", protect, militaryAuth, sendMessage);

/**
 * @route   GET /api/military-support/chatrooms
 * @desc    Fetch all military support chatrooms
 * @access  Private (Military only)
 */
router.get("/chatrooms", protect, militaryAuth, getChatrooms);

/**
 * @route   POST /api/military-support/chatrooms
 * @desc    Create a new military chatroom
 * @access  Private (Military only)
 */
router.post("/chatrooms", protect, militaryAuth, createChatroom);

export default router;
