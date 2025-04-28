import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Subscription Document Interface ---
export interface ISubscription extends Document {
  user: Types.ObjectId;
  status:
    | "trial"
    | "active"
    | "inactive"
    | "expired"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid";
  plan: "free-trial" | "basic" | "standard" | "premium";
  provider: "stripe" | "paypal";
  trialEnd?: Date;
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
  currentPeriodEnd?: Date;
  priceId?: string;
  stripeSubscriptionId?: string;
  webhookEventId?: string;
  origin: "user" | "webhook" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtual
  durationDays?: number;

  // Instance methods
  cancel(): Promise<ISubscription>;
  renew(periodEnd: Date): Promise<ISubscription>;
  isTrialActive(): boolean;
}

// --- Subscription Model Static Interface ---
export interface ISubscriptionModel extends Model<ISubscription> {
  findByUser(userId: Types.ObjectId): Promise<ISubscription[]>;
  expireSubscriptions(): Promise<void>;
}

// --- Schema Definition ---
const SubscriptionSchema = new Schema<ISubscription, ISubscriptionModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
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
      index: true,
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
    trialEnd: { type: Date, default: null },
    subscriptionStart: { type: Date, default: null },
    subscriptionEnd: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    priceId: { type: String, trim: true, default: null },
    stripeSubscriptionId: { type: String, trim: true, default: null },
    webhookEventId: { type: String, trim: true, default: null },
    origin: {
      type: String,
      enum: ["user", "webhook", "admin"],
      default: "user",
    },
    isActive: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Virtuals ---
SubscriptionSchema.virtual("durationDays").get(function (this: ISubscription): number | null {
  if (this.subscriptionStart && this.subscriptionEnd) {
    const diff = this.subscriptionEnd.getTime() - this.subscriptionStart.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// --- Pre-save Hook ---
SubscriptionSchema.pre<ISubscription>("save", function (next) {
  const now = new Date();
  if (this.subscriptionEnd && this.subscriptionEnd < now) {
    this.status = "expired";
  }
  this.isActive = ["active", "trial"].includes(this.status);
  next();
});

// --- Instance Methods ---
SubscriptionSchema.methods.cancel = async function (this: ISubscription): Promise<ISubscription> {
  this.status = "canceled";
  this.isActive = false;
  return this.save();
};

SubscriptionSchema.methods.renew = async function (
  this: ISubscription,
  periodEnd: Date
): Promise<ISubscription> {
  this.currentPeriodEnd = periodEnd;
  this.status = "active";
  this.isActive = true;
  if (!this.subscriptionStart) this.subscriptionStart = new Date();
  return this.save();
};

SubscriptionSchema.methods.isTrialActive = function (this: ISubscription): boolean {
  return this.status === "trial" && !!this.trialEnd && this.trialEnd.getTime() > Date.now();
};

// --- Static Methods ---
SubscriptionSchema.statics.findByUser = function (
  this: ISubscriptionModel,
  userId: Types.ObjectId
): Promise<ISubscription[]> {
  return this.find({ user: userId }).sort({ createdAt: -1 }).exec();
};

SubscriptionSchema.statics.expireSubscriptions = async function (
  this: ISubscriptionModel
): Promise<void> {
  const now = new Date();
  await this.updateMany(
    { subscriptionEnd: { $lt: now }, isActive: true },
    { status: "expired", isActive: false }
  ).exec();
};

// --- Model Export ---
export const Subscription = mongoose.model<ISubscription, ISubscriptionModel>(
  "Subscription",
  SubscriptionSchema
);

export default Subscription;
