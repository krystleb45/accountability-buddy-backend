import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface ISubscription extends Document {
  isActive: boolean; // Changed from `unknown` to `boolean` for clarity
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
    | string; // Allow additional statuses
  plan: "free-trial" | "basic" | "standard" | "premium" | string; // Allow custom plans
  trialEnd?: Date;
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
  provider: "stripe" | "paypal";
  stripeSubscriptionId?: string; // Added for Stripe integration
  currentPeriodEnd?: Date; // Added for subscription period tracking
  createdAt?: Date;
  updatedAt?: Date;
}

const SubscriptionSchema: Schema<ISubscription> = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
    trialEnd: { type: Date },
    subscriptionStart: { type: Date },
    subscriptionEnd: { type: Date },
    provider: {
      type: String,
      enum: ["stripe", "paypal"],
      required: true,
    },
    stripeSubscriptionId: { type: String }, // Added for Stripe subscription ID
    currentPeriodEnd: { type: Date }, // Added for subscription period tracking
  },
  { timestamps: true },
);

// Pre-save hook to update the subscription status if expired
SubscriptionSchema.pre<ISubscription>("save", function (next) {
  try {
    // Mark subscription as expired if the end date is in the past
    if (this.subscriptionEnd && new Date(this.subscriptionEnd) < new Date()) {
      this.status = "expired";
    }

    // Automatically set `isActive` based on status
    this.isActive = this.status === "active" || this.status === "trial";

    next();
  } catch (error) {
    // Cast error to Error
    const err = error instanceof Error ? error : new Error(String(error));
    next(err);
  }
});

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema,
);

export default Subscription;
