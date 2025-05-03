// src/api/routes/follow.ts
import { Router, Request, Response, NextFunction } from "express";
import { protect } from "../middleware/authMiddleware";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import FollowController from "../controllers/FollowController";

const router = Router();

// Follow a user
router.post(
  "/:userId",
  protect,
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await FollowController.followUser(req, res, next);
  })
);

// Unfollow a user
router.delete(
  "/:userId",
  protect,
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await FollowController.unfollowUser(req, res, next);
  })
);

// Get followers of a user
router.get(
  "/followers/:userId",
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await FollowController.getFollowers(req, res, next);
  })
);

// Get users a user is following
router.get(
  "/following/:userId",
  param("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await FollowController.getFollowing(req, res, next);
  })
);

export default router;
