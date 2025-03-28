import mongoose, { Schema, Document } from "mongoose";

// Interface for a redemption
export interface IRedemption {
  reward: string; // Could be a reference to a Reward model or a string for now
  pointsSpent: number;
  redemptionDate: Date;
}

// Interface for the Point model
export interface IPoint extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User model
  points: number; // Number of points the user has
  redemptions: IRedemption[]; // List of redemptions made with points
  createdAt: Date; // Timestamp for when the record was created
  updatedAt: Date; // Timestamp for when the record was last updated
}

// Define the Point schema
const PointSchema = new Schema<IPoint>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  points: {
    type: Number,
    default: 0, // Default points to 0
    required: true,
  },
  redemptions: [
    {
      reward: { type: String, required: true }, // Reward being redeemed (can be more complex, e.g., reference to Reward model)
      pointsSpent: { type: Number, required: true },
      redemptionDate: { type: Date, default: Date.now },
    },
  ],
}, { 
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Method to add points to a user's account
PointSchema.methods.addPoints = async function (pointsToAdd: number): Promise<void> {
  this.points += pointsToAdd;
  await this.save();
};

// Method to subtract points when a user redeems a reward
PointSchema.methods.subtractPoints = async function (pointsToSubtract: number): Promise<void> {
  if (this.points < pointsToSubtract) {
    throw new Error("Insufficient points.");
  }
  this.points -= pointsToSubtract;
  await this.save();
};

// Method to record a redemption
PointSchema.methods.recordRedemption = async function (reward: string, pointsSpent: number): Promise<void> {
  const redemption: IRedemption = {
    reward,
    pointsSpent,
    redemptionDate: new Date(),
  };
  this.redemptions.push(redemption);
  await this.save();
};

// Export the Point model
const Point = mongoose.model<IPoint>("Point", PointSchema);

export default Point;
