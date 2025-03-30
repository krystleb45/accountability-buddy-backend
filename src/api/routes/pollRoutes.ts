import { Router } from "express";
import { createPoll, getPollsByGroup, voteOnPoll, getPollResults } from "../controllers/PollController"; // Importing controllers
import { protect } from "../middleware/authMiddleware"; // Auth middleware for protecting routes
import { check } from "express-validator"; // For validation

const router: Router = Router();

// Route to create a new poll in a group
router.post(
  "/groups/:groupId/polls/create",
  protect,
  [
    check("question", "Poll question is required").notEmpty(),
    check("options", "Poll options are required").isArray().notEmpty(),
    check("expirationDate", "Expiration date is required").notEmpty().isISO8601(),
  ],
  createPoll // Create poll controller
);

// Route to get polls for a specific group
router.get("/groups/:groupId/polls", protect, getPollsByGroup); // Get polls by group controller

// Route to vote on a poll
router.post(
  "/polls/vote",
  protect,
  [
    check("pollId", "Poll ID is required").notEmpty().isMongoId(),
    check("optionId", "Option ID is required").notEmpty().isMongoId(),
  ],
  voteOnPoll // Vote on poll controller
);

// Route to get poll results
router.get("/polls/:pollId/results", protect, getPollResults); // Get poll results controller

export default router;
