import type { Router } from "express";
import express from "express";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import {
  createChallenge,
  getPublicChallenges,
  joinChallenge,
  leaveChallenge,
  getChallengeById,
} from "../controllers/ChallengeController";

const router: Router = express.Router();

const challengeCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: "Too many challenges created from this IP. Please try again later.",
});

/**
 * @swagger
 * /api/challenge:
 *   post:
 *     summary: Create a new challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, milestones]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [weekly, monthly]
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               milestones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                     target:
 *                       type: number
 *     responses:
 *       201:
 *         description: Challenge created successfully
 */
router.post("/", protect, challengeCreateLimiter, createChallenge);

/**
 * @swagger
 * /api/challenge/public:
 *   get:
 *     summary: Get all public challenges
 *     tags: [Challenges]
 *     responses:
 *       200:
 *         description: Public challenges retrieved successfully
 */
router.get("/public", getPublicChallenges);

/**
 * @swagger
 * /api/challenge/join:
 *   post:
 *     summary: Join a challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [challengeId]
 *             properties:
 *               challengeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Joined challenge successfully
 */
router.post("/join", protect, joinChallenge);

/**
 * @swagger
 * /api/challenge/leave:
 *   post:
 *     summary: Leave a challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [challengeId]
 *             properties:
 *               challengeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Left challenge successfully
 */
router.post("/leave", protect, leaveChallenge);

/**
 * @swagger
 * /api/challenge/{id}:
 *   get:
 *     summary: Get challenge details by ID
 *     tags: [Challenges]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Challenge details retrieved
 *       404:
 *         description: Challenge not found
 */
router.get("/:id", getChallengeById);

export default router;
