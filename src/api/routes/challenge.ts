// src/api/routes/challenge.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { check, param } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  createChallenge,
  getPublicChallenges,
  joinChallenge,
  leaveChallenge,
  getChallengeById,
} from "../controllers/ChallengeController";

const router = Router();

// Limit challenge creation to 3 per IP per 15 minutes
const challengeCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many challenges created from this IP. Please try again later.",
  },
});

/**
 * Create a new challenge
 * POST /api/challenge
 * Protected + rate-limited + body validation
 */
router.post(
  "/",
  protect,
  challengeCreateLimiter,
  [
    check("name", "Name is required").notEmpty(),
    check("type", "Type must be 'weekly' or 'monthly'")
      .isIn(["weekly", "monthly"]),
    check("milestones", "Milestones array is required")
      .isArray({ min: 1 }),
    check("milestones.*.label", "Each milestone must have a label")
      .notEmpty(),
    check("milestones.*.target", "Each milestone must have a numeric target")
      .isNumeric(),
  ],
  handleValidationErrors,
  createChallenge
);

/**
 * Get all public challenges
 * GET /api/challenge/public
 * Public, no rate-limit
 */
router.get("/public", getPublicChallenges);

/**
 * Join a challenge
 * POST /api/challenge/join
 * Protected + body validation
 */
router.post(
  "/join",
  protect,
  [
    check("challengeId", "challengeId is required")
      .notEmpty()
      .isMongoId()
      .withMessage("challengeId must be a valid Mongo ID"),
  ],
  handleValidationErrors,
  joinChallenge
);

/**
 * Leave a challenge
 * POST /api/challenge/leave
 * Protected + body validation
 */
router.post(
  "/leave",
  protect,
  [
    check("challengeId", "challengeId is required")
      .notEmpty()
      .isMongoId()
      .withMessage("challengeId must be a valid Mongo ID"),
  ],
  handleValidationErrors,
  leaveChallenge
);

/**
 * Get challenge details by ID
 * GET /api/challenge/:id
 * Public + path-param validation
 */
router.get(
  "/:id",
  [
    param("id", "Invalid challenge ID").isMongoId(),
  ],
  handleValidationErrors,
  getChallengeById
);

export default router;
