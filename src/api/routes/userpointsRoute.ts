// src/api/routes/userpointsRoute.ts
import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as PointController from "../controllers/pointController";

const router = Router();

/**
 * GET /api/users/points
 * (fetch current user’s points)
 */
router.get(
  "/points",
  protect,
  PointController.getUserPoints
);

/**
 * POST /api/users/points/add
 * (add points to current user)
 */
router.post(
  "/points/add",
  protect,
  [ check("points", "Points must be a positive number").isInt({ gt: 0 }) ],
  handleValidationErrors,
  PointController.addPoints
);

/**
 * POST /api/users/points/subtract
 * (subtract points from current user)
 */
router.post(
  "/points/subtract",
  protect,
  [ check("points", "Points must be a positive number").isInt({ gt: 0 }) ],
  handleValidationErrors,
  PointController.subtractPoints
);

/**
 * POST /api/users/points/redeem
 * (redeem user’s points for a reward)
 */
router.post(
  "/points/redeem",
  protect,
  [ check("rewardId", "Reward ID is required").notEmpty() ],
  handleValidationErrors,
  PointController.redeemPoints
);

export default router;
