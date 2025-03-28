import mongoose, { Schema, Document } from "mongoose";

// Interface for the Redemption model
export interface IRedemption extends Document {
  user: mongoose.Types.ObjectId; // Reference to the user who made the redemption
  pointsUsed: number; // Number of points used in the redemption
  item: string; // The item that was redeemed (e.g., a badge, gift card, etc.)
  redemptionDate: Date; // Date when the redemption took place
}

// Define the Redemption Schema
const RedemptionSchema: Schema = new Schema<IRedemption>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  pointsUsed: {
    type: Number,
    required: true,
    min: [1, "Points used must be greater than 0"],
  },
  item: {
    type: String,
    required: true,
  },
  redemptionDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Create the Redemption model
const Redemption = mongoose.model<IRedemption>("Redemption", RedemptionSchema);

export default Redemption;
