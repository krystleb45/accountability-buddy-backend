import mongoose, { Schema, Document } from "mongoose";

// Interface for the Reward model
export interface IReward extends Document {
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: "badge" | "discount" | "giftCard" | "recognition";
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Reward Schema
const RewardSchema: Schema = new Schema<IReward>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pointsRequired: { type: Number, required: true, min: 1 },
    rewardType: { type: String, enum: ["badge", "discount", "giftCard", "recognition"], required: true },
    imageUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Create the Reward model
const Reward = mongoose.model<IReward>("Reward", RewardSchema);

export default Reward;  // Export the Reward model
