import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Settings Type ---
export interface IntegrationSettings {
  [key: string]: unknown;
}

// --- Integration Interface ---
export interface IIntegration extends Document {
  user: Types.ObjectId;
  type: "webhook" | "api" | "slack" | "google_calendar" | "github" | "custom";
  settings: IntegrationSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance method
  toggleActiveState(): Promise<IIntegration>;
}

// --- Integration Model Interface ---
export interface IIntegrationModel extends Model<IIntegration> {
  findActiveIntegrationsByUser(userId: Types.ObjectId): Promise<IIntegration[]>;
}

// --- Schema Definition ---
const IntegrationSchema = new Schema<IIntegration, IIntegrationModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["webhook", "api", "slack", "google_calendar", "github", "custom"],
      required: true,
      index: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
IntegrationSchema.index({ user: 1, type: 1 });

// --- Instance Methods ---
IntegrationSchema.methods.toggleActiveState = async function (
  this: IIntegration
): Promise<IIntegration> {
  this.isActive = !this.isActive;
  await this.save();
  return this;
};

// --- Static Methods ---
IntegrationSchema.statics.findActiveIntegrationsByUser = function (
  userId: Types.ObjectId
): Promise<IIntegration[]> {
  return this.find({ user: userId, isActive: true }).sort({ type: 1 });
};

// --- Model Export ---
export const Integration = mongoose.model<IIntegration, IIntegrationModel>(
  "Integration",
  IntegrationSchema
);

export default Integration;
