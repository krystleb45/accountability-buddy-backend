// src/api/models/Redemption.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Redemption Document Interface ---
export interface IRedemption extends Document {
  user: Types.ObjectId;         // User who made the redemption
  pointsUsed: number;           // Points spent
  item: string;                 // Redeemed item identifier or description
  redemptionDate: Date;         // When the redemption occurred
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-generated

  // Instance methods
  summarize(): string;
}

// --- Redemption Model Static Interface ---
export interface IRedemptionModel extends Model<IRedemption> {
  findByUser(userId: Types.ObjectId): Promise<IRedemption[]>;
  findByDateRange(start: Date, end: Date): Promise<IRedemption[]>;
}

// --- Schema Definition ---
const RedemptionSchema = new Schema<IRedemption, IRedemptionModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pointsUsed: {
      type: Number,
      required: true,
      min: [1, "Points used must be at least 1"],
    },
    item: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Item description cannot exceed 200 characters"],
    },
    redemptionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
RedemptionSchema.index({ user: 1, redemptionDate: -1 });

// --- Instance Methods ---
RedemptionSchema.methods.summarize = function (this: IRedemption): string {
  return `User ${this.user.toString()} redeemed '${this.item}' for ${this.pointsUsed} points on ${this.redemptionDate.toISOString()}`;
};

// --- Static Methods ---
RedemptionSchema.statics.findByUser = function (
  userId: Types.ObjectId
): Promise<IRedemption[]> {
  return this.find({ user: userId })
    .sort({ redemptionDate: -1 })
    .exec();
};

RedemptionSchema.statics.findByDateRange = function (
  start: Date,
  end: Date
): Promise<IRedemption[]> {
  return this.find({
    redemptionDate: { $gte: start, $lte: end }
  })
    .sort({ redemptionDate: 1 })
    .exec();
};

// --- Model Export ---
export const Redemption = mongoose.model<IRedemption, IRedemptionModel>(
  "Redemption",
  RedemptionSchema
);
export default Redemption;
