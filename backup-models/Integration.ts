// src/api/models/Integration.ts

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
    },
    type: {
      type: String,
      enum: ["webhook", "api", "slack", "google_calendar", "github", "custom"],
      required: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
IntegrationSchema.index({ user: 1 });
IntegrationSchema.index({ type: 1 });
IntegrationSchema.index({ isActive: 1 });

// Or, if you prefer a compound index:
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
  return this.find({ user: userId, isActive: true }).sort({ type: 1 }).exec();
};

// --- Model Export ---
export const Integration = mongoose.model<IIntegration, IIntegrationModel>(
  "Integration",
  IntegrationSchema
);

export default Integration;
