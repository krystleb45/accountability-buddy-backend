// src/api/routes/rateLimit.ts
import { Router } from "express";
import { apiLimiter, getRateLimitStatus } from "../controllers/RateLimiterController";

const router = Router();

// Apply the limiter to all subsequent routes
router.use(apiLimiter);

// Endpoint to check current rate‐limit usage
router.get("/status", getRateLimitStatus);

export default router;
