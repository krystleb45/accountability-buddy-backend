// utils/streakUtils.ts

// ✅ Define milestone streaks
const STREAK_MILESTONES: Record<number, { badgeId: string; bonusXP: number }> = {
  3: { badgeId: "streak-3-days", bonusXP: 25 },
  7: { badgeId: "streak-7-days", bonusXP: 50 },
  14: { badgeId: "streak-14-days", bonusXP: 75 },
  30: { badgeId: "streak-30-days", bonusXP: 100 },
  100: { badgeId: "streak-100-days", bonusXP: 200 },
};
  
export interface StreakRewardResult {
    badgeId?: string;
    bonusXP: number;
  }
  
/**
   * ✅ Check if the current streak qualifies for a milestone reward.
   */
export const checkStreakMilestone = (streakCount: number): StreakRewardResult => {
  const reward = STREAK_MILESTONES[streakCount];
  return reward ? { badgeId: reward.badgeId, bonusXP: reward.bonusXP } : { bonusXP: 0 };
};
  