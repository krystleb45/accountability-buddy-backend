import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IGamification extends Document {
  userId: Types.ObjectId;
  level: number;
  points: number;
  addPoints(amount: number): Promise<IGamification>;
}

export interface IGamificationModel extends Model<IGamification> {}

const GamificationSchema = new Schema<IGamification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    level: { type: Number, default: 1 },
    points: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

/**
 * Instance method to add points (and bump level once per 100 points).
 */
GamificationSchema.methods.addPoints = async function (
  this: IGamification,
  amount: number
): Promise<IGamification> {
  this.points += amount;
  // simple level-up logic: 1 level per 100 points
  const newLevel = Math.floor(this.points / 100) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
  }
  await this.save();
  return this;
};

export const Gamification = mongoose.model<IGamification, IGamificationModel>(
  "Gamification",
  GamificationSchema
);
export default Gamification;
