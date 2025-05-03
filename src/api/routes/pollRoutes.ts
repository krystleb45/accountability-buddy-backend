// src/api/routes/pollRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import { check, param } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import {
  createPoll,
  getPollsByGroup,
  voteOnPoll,
  getPollResults,
} from "../controllers/PollController";

const router = Router();

/**
 * POST /api/polls/groups/:groupId/polls/create
 * Create a new poll for a group
 */
router.post(
  "/groups/:groupId/polls/create",
  protect,
  [
    param("groupId", "Invalid group ID").isMongoId(),
    check("question", "Poll question is required").notEmpty(),
    check("options", "Poll options are required").isArray({ min: 1 }),
    check("expirationDate", "Expiration date is required").notEmpty().isISO8601(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await createPoll(req, res, next);
  })
);

/**
 * GET /api/polls/groups/:groupId/polls
 * Get all polls for a specific group
 */
router.get(
  "/groups/:groupId/polls",
  protect,
  param("groupId", "Invalid group ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await getPollsByGroup(req, res, next);
  })
);

/**
 * POST /api/polls/vote
 * Vote on a poll
 */
router.post(
  "/polls/vote",
  protect,
  [
    check("pollId", "Poll ID is required").notEmpty().isMongoId(),
    check("optionId", "Option ID is required").notEmpty().isMongoId(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await voteOnPoll(req, res, next);
  })
);

/**
 * GET /api/polls/polls/:pollId/results
 * Get results of a poll
 */
router.get(
  "/polls/:pollId/results",
  protect,
  param("pollId", "Invalid poll ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await getPollResults(req, res, next);
  })
);

export default router;
