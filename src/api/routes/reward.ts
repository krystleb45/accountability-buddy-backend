// src/api/routes/rewards.ts
import type { Router } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as RewardController from "../controllers/RewardController";

const router: Router = express.Router();

// throttling
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * GET /api/rewards
 * Public: list all available rewards (optionally filter by maxPoints/page/limit)
 */
router.get(
  "/",
  RewardController.listRewards
);

/**
 * GET /api/rewards/my
 * Private: list the current user's redeemed rewards
 */
router.get(
  "/my",
  protect,
  RewardController.getMyRewards
);

/**
 * POST /api/rewards/redeem
 * Private: redeem a reward
 */
router.post(
  "/redeem",
  protect,
  rateLimiter,
  [ check("rewardId").notEmpty().withMessage("Reward ID is required.") ],
  handleValidationErrors,
  RewardController.redeemReward
);

/**
 * POST /api/rewards/create
 * Private/Admin: create a new reward
 */
router.post(
  "/create",
  protect,
  roleBasedAccessControl(["admin"]),
  rateLimiter,
  [
    check("name").notEmpty().withMessage("Title is required."),
    check("description").optional().isString(),
    check("pointsRequired").isNumeric().withMessage("Points must be a number."),
    check("rewardType").notEmpty().withMessage("Reward type is required."),
    check("imageUrl").optional().isURL().withMessage("Must be a valid URL."),
  ],
  handleValidationErrors,
  RewardController.createReward
);

export default router;
