import type { Router } from "express";
import express from "express";
import {
  sendMessage,
  getResources,
  getDisclaimer,
} from "../controllers/militarySupportController";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import militaryAuth from "../middleware/militaryAuth";

const router: Router = express.Router();

// Chatroom Routes
router.post("/chat/send", protect, militaryAuth, sendMessage);

// Resources Route
router.get("/resources", getResources);

// Disclaimer Route
router.get("/disclaimer", getDisclaimer);

export default router;
