// src/api/routes/rateLimit.ts
import { Router } from "express";
import { getRateLimitStatus } from "../controllers/RateLimiterController";

const router = Router();

// GET /api/rate-limit/status
router.get("/status", getRateLimitStatus);

export default router;
