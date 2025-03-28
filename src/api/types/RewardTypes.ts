import { Document } from "mongoose";

// Define the type for Reward model
export interface IReward extends Document {
  name: string; // Name of the reward (e.g., "Free Badge", "Gift Card")
  description: string; // Description of what the reward is
  pointsRequired: number; // Number of points required to redeem the reward
  rewardType: "badge" | "discount" | "giftCard" | "recognition"; // Type of reward
  imageUrl?: string; // Optional image associated with the reward (e.g., image of the badge or gift card)
  createdAt: Date; // Timestamp when the reward was created
  updatedAt: Date; // Timestamp when the reward was last updated
}

// Optional: Define a type for filtering rewards when querying
export interface IRewardFilters {
  rewardType?: "badge" | "discount" | "giftCard" | "recognition"; // Filter by reward type
  pointsRequired?: number; // Filter by points required for the reward
}
