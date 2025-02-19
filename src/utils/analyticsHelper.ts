interface Goal {
  status: string; // e.g., "completed", "in-progress"
  progress?: number; // Progress percentage (0-100)
  milestones?: Milestone[]; // Array of milestones
}

interface Milestone {
  completed: boolean; // Whether the milestone is completed
}

interface Challenge {
  participants: Participant[]; // Array of participant details
}

interface Participant {
  user: string; // User ID as string
  progress: number; // Progress percentage (0-100)
}

interface ActivityLogEntry {
  action: string; // Description of the action
  timestamp: Date; // Timestamp of the action
}

/**
 * Calculate the goal completion rate for a user.
 * @param {Goal[]} goals - Array of user's goals.
 * @returns {number} - Goal completion rate as a percentage.
 */
export const calculateGoalCompletionRate = (goals: Goal[]): number => {
  if (!Array.isArray(goals) || goals.length === 0) return 0; // No goals, rate is 0%

  const completedGoals = goals.filter(
    (goal) => goal.status === "completed",
  ).length;
  const totalGoals = goals.length;

  return Math.round((completedGoals / totalGoals) * 100); // Round to nearest whole number
};

/**
 * Calculate the participation rate in challenges for a user.
 * @param {Challenge[]} challenges - Array of challenges.
 * @param {string} userId - The user's ID.
 * @returns {number} - Challenge participation rate as a percentage.
 */
export const calculateChallengeParticipationRate = (
  challenges: Challenge[],
  userId: string,
): number => {
  if (!Array.isArray(challenges) || challenges.length === 0) return 0; // No challenges, rate is 0%

  const completedChallenges = challenges.filter((challenge) =>
    challenge.participants.some(
      (participant) =>
        participant.user === userId && participant.progress >= 100,
    ),
  ).length;

  const totalChallenges = challenges.length;

  return Math.round((completedChallenges / totalChallenges) * 100); // Round to nearest whole number
};

/**
 * Calculate the user's average progress across all goals.
 * @param {Goal[]} goals - Array of user's goals.
 * @returns {number} - Average progress across goals.
 */
export const calculateAverageGoalProgress = (goals: Goal[]): number => {
  if (!Array.isArray(goals) || goals.length === 0) return 0; // No goals, progress is 0%

  const totalProgress = goals.reduce(
    (sum, goal) => sum + (goal.progress || 0),
    0,
  );

  const averageProgress = totalProgress / goals.length;

  return parseFloat(averageProgress.toFixed(2)); // Return average with two decimal precision
};

/**
 * Calculate the user's activity level based on actions taken.
 * @param {ActivityLogEntry[]} activityLog - Array of user activities (e.g., login, updates).
 * @returns {string} - Activity level: "high", "medium", or "low".
 */
export const calculateUserActivityLevel = (
  activityLog: ActivityLogEntry[],
): string => {
  const totalActions = Array.isArray(activityLog) ? activityLog.length : 0;

  // Define activity levels based on the number of actions
  if (totalActions >= 50) return "high";
  if (totalActions >= 20) return "medium";
  return "low";
};

/**
 * Calculate the user's milestone completion rate.
 * @param {Goal[]} goals - Array of user's goals.
 * @returns {number} - Milestone completion rate as a percentage.
 */
export const calculateMilestoneCompletionRate = (goals: Goal[]): number => {
  if (!Array.isArray(goals) || goals.length === 0) return 0; // No goals, rate is 0%

  let totalMilestones = 0;
  let completedMilestones = 0;

  goals.forEach((goal) => {
    totalMilestones += Array.isArray(goal.milestones)
      ? goal.milestones.length
      : 0;
    completedMilestones += (goal.milestones || []).filter(
      (milestone) => milestone.completed,
    ).length;
  });

  return totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0;
};
