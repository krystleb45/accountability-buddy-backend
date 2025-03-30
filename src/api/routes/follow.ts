import { Router } from "express";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import FollowController from "../controllers/FollowController";

const router = Router();

// Follow a user
router.post("/:userId", protect, FollowController.followUser);

// Unfollow a user
router.delete("/:userId", protect, FollowController.unfollowUser);

// Get followers of a user
router.get("/followers/:userId", FollowController.getFollowers);

// Get following list of a user
router.get("/following/:userId", FollowController.getFollowing);

export default router;
