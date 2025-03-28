import type { Router } from "express";
import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import {
  createChallenge,
  getPublicChallenges,
  joinChallenge,
  leaveChallenge,
  getChallengeById, // ✅ now implemented below
} from "../controllers/challengeController";

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
router.post("/", authMiddleware, challengeCreateLimiter, createChallenge);

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
router.post("/join", authMiddleware, joinChallenge);

/**
 * ✅ @route   POST /challenge/leave
 * ✅ @desc    Leave a challenge
 * ✅ @access  Private
 */
router.post("/leave", authMiddleware, leaveChallenge);

/**
 * ✅ @route   GET /challenge/:id
 * ✅ @desc    Get full challenge detail
 * ✅ @access  Public (or conditional based on visibility)
 */
router.get("/:id", getChallengeById);

export default router;
