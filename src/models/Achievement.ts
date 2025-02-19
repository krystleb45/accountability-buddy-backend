import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IAchievement extends Document {
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AchievementSchema: Schema<IAchievement> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Achievement name is required"],
      trim: true,
      maxlength: [100, "Achievement name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Achievement description is required"],
      maxlength: [500, "Achievement description cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

const Achievement: Model<IAchievement> = mongoose.model<IAchievement>(
  "Achievement",
  AchievementSchema,
);

export default Achievement;
