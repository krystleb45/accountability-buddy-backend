import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

/**
 * Interface for external military support resources such as hotlines, websites, or services.
 */
export interface IExternalSupportResource extends Document {
  title: string;
  url: string;
  description?: string;
  category?: "hotline" | "website" | "forum" | "organization" | "other";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for ExternalSupportResource
const ExternalSupportResourceSchema: Schema<IExternalSupportResource> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Resource title is required."],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long."],
    },
    url: {
      type: String,
      required: [true, "URL is required."],
      trim: true,
      match: [
        /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.+)?$/,
        "Please provide a valid URL.",
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters."],
    },
    category: {
      type: String,
      enum: ["hotline", "website", "forum", "organization", "other"],
      default: "other",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ExternalSupportResourceSchema.index({ title: "text", url: 1 });

const ExternalSupportResource: Model<IExternalSupportResource> = mongoose.model<IExternalSupportResource>(
  "ExternalSupportResource",
  ExternalSupportResourceSchema
);

export default ExternalSupportResource;
