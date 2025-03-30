import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define a stricter type for settings if possible, or keep it as a generic key-value pair
export interface IntegrationSettings {
  [key: string]: unknown; // Replace `unknown` with a stricter type if settings structure is predictable
}

// Define the IIntegration interface
export interface IIntegration extends Document {
  user: mongoose.Types.ObjectId;
  type: "webhook" | "api" | "slack" | "google_calendar" | "github" | "custom";
  settings: IntegrationSettings; // Replace `any` with the stricter `IntegrationSettings` type
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toggleActiveState: () => Promise<IIntegration>;
}

// Extend the model interface for static methods
interface IIntegrationModel extends Model<IIntegration> {
  findActiveIntegrationsByUser: (
    userId: mongoose.Types.ObjectId
  ) => Promise<IIntegration[]>;
}

// Define the Integration schema
const IntegrationSchema = new Schema<IIntegration>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimize queries for user-specific integrations
    },
    type: {
      type: String,
      enum: ["webhook", "api", "slack", "google_calendar", "github", "custom"],
      required: true,
    },
    settings: {
      type: Schema.Types.Mixed, // Used for flexible structures
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true, // Integration is active by default
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Indexes for optimized queries
IntegrationSchema.index({ user: 1 });
IntegrationSchema.index({ type: 1 });

// Instance method to toggle the active state of an integration
IntegrationSchema.methods.toggleActiveState = async function (
  this: IIntegration,
): Promise<IIntegration> {
  this.isActive = !this.isActive;
  await this.save();
  return this;
};

// Static method to fetch all active integrations for a user
IntegrationSchema.statics.findActiveIntegrationsByUser = async function (
  userId: mongoose.Types.ObjectId,
): Promise<IIntegration[]> {
  return this.find({ user: userId, isActive: true });
};

// Export the Integration model
export const Integration: IIntegrationModel = mongoose.model<
  IIntegration,
  IIntegrationModel
>("Integration", IntegrationSchema);

export default Integration;
