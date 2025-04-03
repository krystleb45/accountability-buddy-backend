import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Subscription interface
export interface ISubscription extends Document {
  isActive: boolean;
  user: mongoose.Types.ObjectId;
  status:
    | "trial"
    | "active"
    | "inactive"
    | "expired"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid"
    | string;
  plan: "free-trial" | "basic" | "standard" | "premium" | string;
  trialEnd?: Date;
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
  provider: "stripe" | "paypal";
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  priceId?: string;
  webhookEventId?: string;
  origin?: "user" | "webhook" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the schema for Subscription
const SubscriptionSchema: Schema<ISubscription> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "trial",
        "active",
        "inactive",
        "expired",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
      ],
      default: "trial",
    },

    plan: {
      type: String,
      enum: ["free-trial", "basic", "standard", "premium"],
      default: "free-trial",
    },

    provider: {
      type: String,
      enum: ["stripe", "paypal"],
      required: true,
    },

    stripeSubscriptionId: {
      type: String,
      default: null,
    },

    priceId: {
      type: String,
      default: null,
    },

    subscriptionStart: {
      type: Date,
      default: null,
    },

    subscriptionEnd: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    trialEnd: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    webhookEventId: {
      type: String,
      default: null,
    },

    origin: {
      type: String,
      enum: ["user", "webhook", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔄 Virtual field: Calculate subscription duration in days
SubscriptionSchema.virtual("durationDays").get(function (this: ISubscription) {
  if (this.subscriptionStart && this.subscriptionEnd) {
    const diff = this.subscriptionEnd.getTime() - this.subscriptionStart.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// ⚙️ Pre-save hook to auto-manage expiration and activity flags
SubscriptionSchema.pre<ISubscription>("save", function (next) {
  try {
    const now = new Date();

    if (this.subscriptionEnd && this.subscriptionEnd < now) {
      this.status = "expired";
    }

    this.isActive = ["active", "trial"].includes(this.status);

    next();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    next(err);
  }
});

// ✅ Model Export
const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema
);

export default Subscription;
