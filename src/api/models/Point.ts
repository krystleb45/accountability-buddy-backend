import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Redemption Subdocument Interface ---
export interface IRedemption {
  _id: Types.ObjectId;      // Unique ID for the redemption entry
  reward: string;           // Reward identifier or description
  pointsSpent: number;      // Points spent for the reward
  redemptionDate: Date;     // When the redemption occurred
}

// --- Point Document Interface ---
export interface IPoint extends Document {
  user: Types.ObjectId;                 // Reference to User
  points: number;                       // Current point balance
  redemptions: Types.DocumentArray<IRedemption>;
  createdAt: Date;                      // Auto-generated
  updatedAt: Date;                      // Auto-generated

  // Instance methods
  addPoints(pointsToAdd: number): Promise<IPoint>;
  subtractPoints(pointsToSubtract: number): Promise<IPoint>;
  recordRedemption(reward: string, pointsSpent: number): Promise<IPoint>;
}

// --- Model Interface for Statics ---
export interface IPointModel extends Model<IPoint> {
  findByUser(userId: Types.ObjectId): Promise<IPoint>;
  getTotalPoints(userId: Types.ObjectId): Promise<number>;
}

// --- Redemption Schema ---
const RedemptionSchema = new Schema<IRedemption>(
  {
    reward: { type: String, required: true, trim: true },
    pointsSpent: { type: Number, required: true, min: [1, "Points spent must be at least 1"] },
    redemptionDate: { type: Date, default: Date.now }
  },
  { _id: true }
);

// --- Point Schema ---
const PointSchema = new Schema<IPoint, IPointModel, IPoint>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    points: {
      type: Number,
      default: 0,
      min: [0, "Points cannot be negative"],
    },
    redemptions: {
      type: [RedemptionSchema],
      default: []
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
  }
);

// --- Instance Methods ---
PointSchema.methods.addPoints = async function (
  this: IPoint,
  pointsToAdd: number
): Promise<IPoint> {
  this.points += pointsToAdd;
  await this.save();
  return this;
};

PointSchema.methods.subtractPoints = async function (
  this: IPoint,
  pointsToSubtract: number
): Promise<IPoint> {
  if (this.points < pointsToSubtract) throw new Error("Insufficient points.");
  this.points -= pointsToSubtract;
  await this.save();
  return this;
};

PointSchema.methods.recordRedemption = async function (
  this: IPoint,
  reward: string,
  pointsSpent: number
): Promise<IPoint> {
  if (this.points < pointsSpent) throw new Error("Insufficient points for redemption.");
  this.points -= pointsSpent;
  this.redemptions.push({ reward, pointsSpent, redemptionDate: new Date() } as any);
  await this.save();
  return this;
};

// --- Static Methods ---
PointSchema.statics.findByUser = function (
  userId: Types.ObjectId
): Promise<IPoint> {
  return this.findOne({ user: userId }).orFail(new Error("Point record not found"));
};

PointSchema.statics.getTotalPoints = async function (
  userId: Types.ObjectId
): Promise<number> {
  const record = await this.findOne({ user: userId });
  return record ? record.points : 0;
};

// --- Model Export ---
export const Point = mongoose.model<IPoint, IPointModel>("Point", PointSchema);
export default Point;
