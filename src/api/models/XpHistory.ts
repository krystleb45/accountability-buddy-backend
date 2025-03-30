import { Document, Schema, model, Types } from "mongoose";

// Define XP History Interface
export interface IXpHistory extends Document {
  userId: Types.ObjectId; // User ID (referencing the User model)
  xp: number; // Amount of XP earned
  date: Date; // The date the XP was earned
  reason: string; // Reason for earning XP (e.g., completing a goal, level up, etc.)
}

// Define XP History Schema
const XpHistorySchema = new Schema<IXpHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Referencing the User model
      required: true, // Associate XP history with a user
    },
    xp: {
      type: Number,
      required: true, // XP earned
    },
    date: {
      type: Date,
      required: true, // Record the date when the XP was earned
      default: Date.now, // Default to current date
    },
    reason: {
      type: String,
      required: true, // Reason for earning XP (e.g., "Completed Goal")
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// XP History Model
const XpHistory = model<IXpHistory>("XpHistory", XpHistorySchema);

export default XpHistory;
