import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Category Union ---
export type ResourceCategory = "hotline" | "website" | "forum" | "organization" | "other";

// --- Document Interface ---
export interface IExternalSupportResource extends Document {
  title: string;
  url: string;
  description?: string;
  category: ResourceCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  domain: string;

  // Instance methods
  deactivate(): Promise<IExternalSupportResource>;
  activate(): Promise<IExternalSupportResource>;
}

// --- Model Interface for Statics ---
export interface IExternalSupportResourceModel extends Model<IExternalSupportResource> {
  findByCategory(category: ResourceCategory): Promise<IExternalSupportResource[]>;
  searchByTitle(text: string): Promise<IExternalSupportResource[]>;
}

// --- Schema Definition ---
const ExternalSupportResourceSchema = new Schema<IExternalSupportResource, IExternalSupportResourceModel>(
  {
    title: {
      type: String,
      required: [true, "Resource title is required."],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long."],
      maxlength: [200, "Title cannot exceed 200 characters."],
      index: true,
    },
    url: {
      type: String,
      required: [true, "URL is required."],
      trim: true,
      match: [
        /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.*)?$/,
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
      index: true,
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
ExternalSupportResourceSchema.index({ title: "text", url: 1 });

// --- Virtuals ---
ExternalSupportResourceSchema.virtual("domain").get(function (this: IExternalSupportResource): string {
  try {
    const u = new URL(this.url);
    return u.hostname;
  } catch {
    return "";
  }
});

// --- Instance Methods ---
ExternalSupportResourceSchema.methods.deactivate = async function (this: IExternalSupportResource): Promise<IExternalSupportResource> {
  this.isActive = false;
  await this.save();
  return this;
};

ExternalSupportResourceSchema.methods.activate = async function (this: IExternalSupportResource): Promise<IExternalSupportResource> {
  this.isActive = true;
  await this.save();
  return this;
};

// --- Static Methods ---
ExternalSupportResourceSchema.statics.findByCategory = function (
  category: ResourceCategory
): Promise<IExternalSupportResource[]> {
  return this.find({ category, isActive: true }).sort({ title: 1 });
};

ExternalSupportResourceSchema.statics.searchByTitle = function (
  text: string
): Promise<IExternalSupportResource[]> {
  return this.find({ $text: { $search: text }, isActive: true }, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } });
};

// --- Model Export ---
export const ExternalSupportResource = mongoose.model<IExternalSupportResource, IExternalSupportResourceModel>(
  "ExternalSupportResource",
  ExternalSupportResourceSchema
);
export default ExternalSupportResource;
