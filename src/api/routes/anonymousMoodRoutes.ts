// src/api/routes/anonymousMoodRoutes.ts

import { Router } from "express";
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

// Public routes - no authentication required
router.get("/mood-trends/community", getCommunityMoodData);
router.get("/mood-trends/history", getMoodTrends);
router.get("/mood-stats", getMoodStatistics);
router.get("/mood-encouragement/:mood", getMoodEncouragement);

// Anonymous session routes - require session ID
router.post("/mood-checkin", anonymousAuth, submitMoodCheckIn);
router.get("/mood-checkin/today", anonymousAuth, hasSubmittedToday);

export default router;
