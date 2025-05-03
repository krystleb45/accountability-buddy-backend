// src/api/routes/user.ts
import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as userCtrl from "../controllers/userController";
import { getLeaderboard } from "../controllers/LeaderboardController";


const router = Router();

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests.",
});

// Profile
router.get("/profile", protect, userCtrl.getUserProfile);
router.put(
  "/profile",
  protect,
  [
    check("email").optional().isEmail().withMessage("Must be a valid email"),
    check("username").optional().notEmpty().withMessage("Username cannot be empty"),
  ],
  handleValidationErrors,
  userCtrl.updateUserProfile
);

// Password
router.patch(
  "/password",
  protect,
  sensitiveLimiter,
  [
    check("currentPassword").notEmpty().withMessage("Current password is required"),
    check("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
  ],
  handleValidationErrors,
  userCtrl.changePassword
);

// Account deletion
router.delete("/account", protect, sensitiveLimiter, userCtrl.deleteUserAccount);

// All users (admin)
router.get("/all", protect, userCtrl.fetchAllUsers);

// Pin / unpin goals
router.post("/pin-goal", protect, userCtrl.pinGoal);
router.delete("/unpin-goal", protect, userCtrl.unpinGoal);
router.get("/pinned-goals", protect, userCtrl.getPinnedGoals);

// Badges
router.get("/badges", protect, userCtrl.fetchBadges);
router.get("/:userId/badges", protect, userCtrl.fetchUserBadges);
router.post("/badges/award", protect, userCtrl.awardBadge);

// Check-in
router.get("/check-in/last", protect, userCtrl.getLastCheckIn);
router.post("/check-in", protect, userCtrl.logCheckIn);

// Featured achievements
router.post("/feature-achievement", protect, userCtrl.featureAchievement);
router.delete("/unfeature-achievement", protect, userCtrl.unfeatureAchievement);
router.get("/featured-achievements", protect, userCtrl.getFeaturedAchievements);

// Leaderboard & stats
router.get("/leaderboard", getLeaderboard);
router.get("/:userId/statistics", protect, userCtrl.getUserStatistics);

// Admin block/unblock
router.post("/:userId/block", protect, userCtrl.blockUser);
router.post("/:userId/unblock", protect, userCtrl.unblockUser);

export default router;
