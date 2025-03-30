import type { Router } from "express";
import express from "express";
import { protect } from "../middleware/authMiddleware"; // ✅ Updated to use 'protect' middleware
import rateLimit from "express-rate-limit";
import {
  createChallenge,
  getPublicChallenges,
  joinChallenge,
  leaveChallenge,
  getChallengeById, // ✅ now implemented below
} from "../controllers/ChallengeController";

const router: Router = express.Router();

// ✅ Rate limiter for challenge creation
const challengeCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: "Too many challenges created from this IP. Please try again later.",
});

/**
 * ✅ @route   POST /challenge
 * ✅ @desc    Create a new challenge
 * ✅ @access  Private (Authenticated users only)
 */
router.post("/", protect, challengeCreateLimiter, createChallenge); // ✅ Replaced 'authMiddleware' with 'protect'

/**
 * ✅ @route   GET /challenge/public
 * ✅ @desc    Get all public challenges
 * ✅ @access  Public
 */
router.get("/public", getPublicChallenges);

/**
 * ✅ @route   POST /challenge/join
 * ✅ @desc    Join a challenge
 * ✅ @access  Private
 */
router.post("/join", protect, joinChallenge); // ✅ Replaced 'authMiddleware' with 'protect'

/**
 * ✅ @route   POST /challenge/leave
 * ✅ @desc    Leave a challenge
 * ✅ @access  Private
 */
router.post("/leave", protect, leaveChallenge); // ✅ Replaced 'authMiddleware' with 'protect'

/**
 * ✅ @route   GET /challenge/:id
 * ✅ @desc    Get full challenge detail
 * ✅ @access  Public (or conditional based on visibility)
 */
router.get("/:id", getChallengeById);

export default router;
