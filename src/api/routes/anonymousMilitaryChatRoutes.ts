// src/api/routes/anonymousMilitaryChatRoutes.ts - UPDATED with mood routes

import { Router } from "express";
import {
  getRooms,
  joinRoom,
  leaveRoom,
  getMessages,
  sendMessage,
  getRoomMemberCount
} from "../controllers/anonymousMilitaryChatController";
import {
  submitMoodCheckIn,
  getCommunityMoodData,
  getMoodTrends,
  hasSubmittedToday,
  getMoodStatistics,
  getMoodEncouragement
} from "../controllers/anonymousMoodController";
import { anonymousAuth } from "../middleware/anonymousAuth";

const router = Router();

// ===== CHAT ROUTES =====

// Public chat routes - no authentication required
router.get("/rooms", getRooms);
router.get("/rooms/:roomId/messages", getMessages);
router.get("/rooms/:roomId/members", getRoomMemberCount);

// Anonymous session chat routes
router.post("/rooms/:roomId/join", anonymousAuth, joinRoom);
router.post("/rooms/:roomId/message", anonymousAuth, sendMessage);
router.post("/rooms/:roomId/leave", anonymousAuth, leaveRoom);

// ===== MOOD CHECK-IN ROUTES =====

// Public mood routes - no authentication required
router.get("/mood-trends/community", getCommunityMoodData);
router.get("/mood-trends/history", getMoodTrends);
router.get("/mood-stats", getMoodStatistics);
router.get("/mood-encouragement/:mood", getMoodEncouragement);

// Anonymous session mood routes - require session ID
router.post("/mood-checkin", anonymousAuth, submitMoodCheckIn);
router.get("/mood-checkin/today", anonymousAuth, hasSubmittedToday);

export default router;
