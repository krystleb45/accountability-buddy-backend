import { User } from "../models/User";
import Badge from "../models/Badge";
import type { IChallenge } from "../models/Challenge";

/**
 * Award XP to a user by incrementing their points.
 * @param userId - The ID of the user to award points to.
 * @param xp - The amount of XP to add.
 */
export const awardXpToUser = async (userId: string, xp: number): Promise<void> => {
  const user = await User.findById(userId);
  if (user) {
    user.points = (user.points || 0) + xp;
    await user.save();
  }
};

/**
 * Reward users when a challenge is completed.
 * Grants XP and milestone_achiever badge progress.
 * @param challenge - The completed challenge object
 */
export const rewardChallengeCompletion = async (challenge: IChallenge): Promise<void> => {
  if (!challenge.participants || challenge.participants.length === 0) return;

  for (const participant of challenge.participants) {
    const userId = participant.user.toString();

    // ✅ Award XP (e.g., 50 XP for completing a challenge)
    await awardXpToUser(userId, 50);

    // ✅ Handle milestone_achiever badge
    const existingBadge = await Badge.findOne({
      user: userId,
      badgeType: "milestone_achiever",
    });

    if (existingBadge) {
      existingBadge.progress += 1;

      // Optional: auto-upgrade badge level based on progress
      if (existingBadge.progress >= existingBadge.goal) {
        if (existingBadge.level === "Bronze") existingBadge.level = "Silver";
        else if (existingBadge.level === "Silver") existingBadge.level = "Gold";
        // Gold stays Gold
      }

      await existingBadge.save();
    } else {
      // ✅ First time earning the badge
      const newBadge = new Badge({
        user: userId,
        badgeType: "milestone_achiever",
        level: "Bronze",
        progress: 1,
        goal: 3, // Require 3 to upgrade to Silver
        pointsRewarded: 25,
        isShowcased: false,
      });

      await newBadge.save();
    }
  }
};
