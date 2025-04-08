import { Router } from "express";
import {
  createPoll,
  getPollsByGroup,
  voteOnPoll,
  getPollResults,
} from "../controllers/PollController";
import { protect } from "../middleware/authMiddleware";
import { check } from "express-validator";

const router: Router = Router();

/**
 * @swagger
 * /api/polls/groups/{groupId}/polls/create:
 *   post:
 *     summary: Create a new poll for a group
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question, options, expirationDate]
 *             properties:
 *               question:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Poll created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/groups/:groupId/polls/create",
  protect,
  [
    check("question", "Poll question is required").notEmpty(),
    check("options", "Poll options are required").isArray().notEmpty(),
    check("expirationDate", "Expiration date is required").notEmpty().isISO8601(),
  ],
  createPoll
);

/**
 * @swagger
 * /api/polls/groups/{groupId}/polls:
 *   get:
 *     summary: Get all polls for a specific group
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the group
 *     responses:
 *       200:
 *         description: List of polls returned
 *       401:
 *         description: Unauthorized
 */
router.get("/groups/:groupId/polls", protect, getPollsByGroup);

/**
 * @swagger
 * /api/polls/polls/vote:
 *   post:
 *     summary: Vote on a poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pollId, optionId]
 *             properties:
 *               pollId:
 *                 type: string
 *               optionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vote submitted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/polls/vote",
  protect,
  [
    check("pollId", "Poll ID is required").notEmpty().isMongoId(),
    check("optionId", "Option ID is required").notEmpty().isMongoId(),
  ],
  voteOnPoll
);

/**
 * @swagger
 * /api/polls/polls/{pollId}/results:
 *   get:
 *     summary: Get results of a poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the poll
 *     responses:
 *       200:
 *         description: Poll results returned
 *       401:
 *         description: Unauthorized
 */
router.get("/polls/:pollId/results", protect, getPollResults);

export default router;
