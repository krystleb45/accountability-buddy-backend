import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the PollResult interface
export interface IPollResult extends Document {
  pollId: mongoose.Types.ObjectId; // The ID of the poll
  optionId: mongoose.Types.ObjectId; // The option that was voted on
  votesCount: number; // The number of votes for this option
  createdAt: Date;
  updatedAt: Date;
}

// Define the PollResult schema
const PollResultSchema: Schema<IPollResult> = new Schema<IPollResult>(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll", // Reference to the Poll model
      required: true,
      index: true, // Indexed for faster lookups
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PollOption", // Reference to the PollOption model
      required: true,
      index: true, // Indexed for faster lookups
    },
    votesCount: {
      type: Number,
      default: 0, // Initialize with 0 votes
    },
  },
  {
    timestamps: true,
  }
);

// Export the PollResult model
const PollResult: Model<IPollResult> = mongoose.model<IPollResult>("PollResult", PollResultSchema);

export default PollResult;
