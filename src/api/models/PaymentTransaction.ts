import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IPaymentTransaction extends Document {
  userId: Types.ObjectId;
  transactionId: string;
  paymentMethod: "card" | "paypal" | "bank_transfer" | "crypto";
  amount: number;
  currency: string;
  status: "initiated" | "processing" | "completed" | "failed" | "refunded";
  description?: string;
  initiatedAt: Date;
  completedAt?: Date;
  paymentGatewayResponse?: Record<string, unknown>;
  isRefundable: boolean;
  refundReason?: string;

  markAsCompleted(): Promise<void>;
  markAsFailed(reason: string): Promise<void>;
  initiateRefund(reason: string): Promise<IPaymentTransaction>;
  isCompleted: boolean; // Virtual field
}

interface IPaymentTransactionModel extends Model<IPaymentTransaction> {
  findByUser(userId: Types.ObjectId): Promise<IPaymentTransaction[]>;
  getTotalAmountForUser(userId: Types.ObjectId): Promise<number>;
}

const PaymentTransactionSchema: Schema<IPaymentTransaction> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "paypal", "bank_transfer", "crypto"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number): boolean => value > 0,
        message: "Transaction amount must be greater than zero",
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 3,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["initiated", "processing", "completed", "failed", "refunded"],
      default: "initiated",
      index: true,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    paymentGatewayResponse: {
      type: Object,
      default: null,
    },
    isRefundable: {
      type: Boolean,
      default: true,
    },
    refundReason: {
      type: String,
      maxlength: 255,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Pre-save validation
PaymentTransactionSchema.pre<IPaymentTransaction>("save", function (next) {
  if (this.amount <= 0) {
    return next(new Error("Transaction amount must be greater than zero."));
  }
  next();
});

// Mark transaction as completed
PaymentTransactionSchema.methods.markAsCompleted = async function (
  this: IPaymentTransaction,
): Promise<void> {
  this.status = "completed";
  this.completedAt = new Date();
  await this.save();
};

// Mark transaction as failed
PaymentTransactionSchema.methods.markAsFailed = async function (
  this: IPaymentTransaction,
  reason: string,
): Promise<void> {
  this.status = "failed";
  this.description = `Failed: ${reason}`;
  await this.save();
};

// Initiate a refund
PaymentTransactionSchema.methods.initiateRefund = async function (
  this: IPaymentTransaction,
  reason: string,
): Promise<IPaymentTransaction> {
  if (!this.isRefundable) {
    throw new Error("This transaction is not eligible for a refund.");
  }

  if (this.status !== "completed") {
    throw new Error("Only completed transactions can be refunded.");
  }

  this.status = "refunded";
  this.refundReason = reason || "No reason provided";
  await this.save();
  return this;
};

// Static methods
PaymentTransactionSchema.statics.findByUser = function (
  userId: Types.ObjectId,
): Promise<IPaymentTransaction[]> {
  return this.find({ userId }).sort({ initiatedAt: -1 });
};

PaymentTransactionSchema.statics.getTotalAmountForUser = async function (
  userId: Types.ObjectId,
): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
    { $group: { _id: "$userId", totalAmount: { $sum: "$amount" } } },
  ]);
  return result.length > 0 ? result[0].totalAmount : 0;
};

// Virtual field for completion status
PaymentTransactionSchema.virtual("isCompleted").get(function (): boolean {
  return this.status === "completed";
});

export const PaymentTransaction: IPaymentTransactionModel = mongoose.model<
  IPaymentTransaction,
  IPaymentTransactionModel
>("PaymentTransaction", PaymentTransactionSchema);
