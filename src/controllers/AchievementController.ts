// Updated AchievementController.ts

const achievements: Array<{ id: string; userId: string; name: string; description: string }> = [];

/**
 * Get all achievements for a user
 */
export const getAllAchievements = async (
  userId: string,
): Promise<{ id: string; userId: string; name: string; description: string }[]> => {
  try {
    // Filter achievements by userId
    return achievements.filter((a) => a.userId === userId);
  } catch (error) {
    throw new Error(`Failed to fetch achievements for user ${userId}: ${(error as Error).message}`);
  }
};

/**
 * Get a single achievement by ID
 */
export const getAchievementById = async (
  id: string,
): Promise<{ id: string; userId: string; name: string; description: string } | null> => {
  try {
    const achievement = achievements.find((a) => a.id === id);
    return achievement || null;
  } catch (error) {
    throw new Error(`Failed to fetch achievement by ID ${id}: ${(error as Error).message}`);
  }
};

/**
 * Create a new achievement
 */
export const addAchievement = async (
  userId: string,
  achievementData: { name: string; description: string },
): Promise<{ id: string; userId: string; name: string; description: string }> => {
  try {
    const { name, description } = achievementData;

    if (!name || !description) {
      throw new Error("Name and description are required");
    }

    // Add userId to the new achievement
    const newAchievement = { id: Date.now().toString(), userId, name, description };
    achievements.push(newAchievement);
    return newAchievement;
  } catch (error) {
    throw new Error(`Failed to add achievement: ${(error as Error).message}`);
  }
};

/**
 * Update an existing achievement by ID
 */
export const updateAchievement = async (
  id: string,
  updateData: { name?: string; description?: string },
): Promise<{ id: string; userId: string; name: string; description: string } | null> => {
  try {
    const achievement = achievements.find((a) => a.id === id);

    if (!achievement) {
      throw new Error("Achievement not found");
    }

    // Update fields if provided
    if (updateData.name) achievement.name = updateData.name;
    if (updateData.description) achievement.description = updateData.description;

    return achievement;
  } catch (error) {
    throw new Error(`Failed to update achievement with ID ${id}: ${(error as Error).message}`);
  }
};

/**
 * Delete an achievement by ID
 */
export const deleteAchievement = async (id: string): Promise<boolean> => {
  try {
    const index = achievements.findIndex((a) => a.id === id);

    if (index === -1) {
      throw new Error("Achievement not found");
    }

    // Remove the achievement
    achievements.splice(index, 1);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete achievement with ID ${id}: ${(error as Error).message}`);
  }
};
