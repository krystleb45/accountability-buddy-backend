import type { Document, Model } from "mongoose";
import mongoose, { Schema, Types } from "mongoose";

// --- Reward Document Interface ---
export interface IReward {
  _id: Types.ObjectId;      // ← explicitly type _id
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: "badge" | "discount" | "giftCard" | "recognition";
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateDetails(data: Partial<Pick<IReward, "description" | "pointsRequired" | "imageUrl">>): Promise<IReward>;
}

// --- Reward Model Static Interface ---
export interface IRewardModel extends Model<IReward & Document> {
  findByType(type: IReward["rewardType"]): Promise<(IReward & Document)[]>;
  getAvailableRewards(maxPoints: number): Promise<(IReward & Document)[]>;
}

// --- Schema Definition ---
const RewardSchema = new Schema<IReward & Document, IRewardModel>(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    pointsRequired: { type: Number, required: true, min: 1 },
    rewardType: {
      type: String,
      enum: ["badge", "discount", "giftCard", "recognition"],
      required: true,
      index: true,
    },
    imageUrl: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
RewardSchema.index({ pointsRequired: 1 });
RewardSchema.index({ rewardType: 1 });

// --- Instance Methods ---
RewardSchema.methods.updateDetails = async function (
  this: IReward & Document,
  data: Partial<Pick<IReward, "description" | "pointsRequired" | "imageUrl">>
): Promise<IReward & Document> {
  if (data.description !== undefined) this.description = data.description;
  if (data.pointsRequired !== undefined) this.pointsRequired = data.pointsRequired;
  if (data.imageUrl !== undefined) this.imageUrl = data.imageUrl;
  await this.save();
  return this;
};

// --- Static Methods ---
RewardSchema.statics.findByType = function (
  this: IRewardModel,
  type: IReward["rewardType"]
): Promise<(IReward & Document)[]> {
  return this.find({ rewardType: type }).sort({ pointsRequired: 1 }).exec();
};

RewardSchema.statics.getAvailableRewards = function (
  this: IRewardModel,
  maxPoints: number
): Promise<(IReward & Document)[]> {
  return this.find({ pointsRequired: { $lte: maxPoints } })
    .sort({ pointsRequired: 1 })
    .exec();
};

// --- Model Export ---
export const Reward = mongoose.model<IReward & Document, IRewardModel>(
  "Reward",
  RewardSchema
);

export default Reward;
