import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import FollowController from "../controllers/FollowController";

const router = Router();

// Follow a user
router.post("/:userId", authMiddleware, FollowController.followUser);

// Unfollow a user
router.delete("/:userId", authMiddleware, FollowController.unfollowUser);

// Get followers of a user
router.get("/followers/:userId", FollowController.getFollowers);

// Get following list of a user
router.get("/following/:userId", FollowController.getFollowing);

export default router;
