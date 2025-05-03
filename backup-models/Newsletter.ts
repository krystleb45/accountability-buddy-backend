// src/api/models/Newsletter.ts
import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import validator from "validator";
import crypto from "crypto";

// --- Interface for Newsletter Document ---
export interface INewsletter extends Document {
  email: string;
  subscribedAt: Date;
  status: "subscribed" | "unsubscribed";
  unsubscribeToken?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  unsubscribe(token: string): Promise<INewsletter>;
  regenerateUnsubscribeToken(): Promise<INewsletter>;
}

// --- Model Interface for Statics ---
export interface INewsletterModel extends Model<INewsletter> {
  findOrCreate(email: string): Promise<INewsletter>;
  findSubscribed(): Promise<INewsletter[]>;
  findUnsubscribed(): Promise<INewsletter[]>;
}

// --- Schema Definition ---
const NewsletterSchema = new Schema<INewsletter, INewsletterModel>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (email: string): boolean => validator.isEmail(email),
        message: "Please provide a valid email address",
      },
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
    },
    unsubscribeToken: {
      type: String,
      required: true,
      default: (): string => crypto.randomBytes(16).toString("hex"),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
NewsletterSchema.index({ email: 1 }, { unique: true });
NewsletterSchema.index({ subscribedAt: 1 });
NewsletterSchema.index({ status: 1 });

// --- Middleware ---
NewsletterSchema.pre<INewsletter>("validate", function (next) {
  // Ensure unsubscribeToken exists
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(16).toString("hex");
  }
  next();
});

// --- Instance Methods ---
NewsletterSchema.methods.unsubscribe = async function (
  this: INewsletter,
  token: string
): Promise<INewsletter> {
  if (token !== this.unsubscribeToken) {
    throw new Error("Invalid unsubscribe token");
  }
  this.status = "unsubscribed";
  await this.save();
  return this;
};

NewsletterSchema.methods.regenerateUnsubscribeToken = async function (
  this: INewsletter
): Promise<INewsletter> {
  this.unsubscribeToken = crypto.randomBytes(16).toString("hex");
  await this.save();
  return this;
};

// --- Static Methods ---
NewsletterSchema.statics.findOrCreate = async function (
  this: INewsletterModel,
  email: string
): Promise<INewsletter> {
  let subscriber = await this.findOne({ email });
  if (!subscriber) {
    subscriber = await this.create({ email });
  }
  return subscriber;
};

NewsletterSchema.statics.findSubscribed = function (
  this: INewsletterModel
): Promise<INewsletter[]> {
  return this.find({ status: "subscribed" }).sort({ subscribedAt: -1 });
};

NewsletterSchema.statics.findUnsubscribed = function (
  this: INewsletterModel
): Promise<INewsletter[]> {
  return this.find({ status: "unsubscribed" }).sort({ updatedAt: -1 });
};

// --- Model Export ---
export const Newsletter = mongoose.model<INewsletter, INewsletterModel>(
  "Newsletter",
  NewsletterSchema
);

export default Newsletter;
