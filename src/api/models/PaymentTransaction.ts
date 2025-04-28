import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Payment Transaction Status & Methods ---
export type TransactionStatus = "initiated" | "processing" | "completed" | "failed" | "refunded";
export type TransactionMethod = "card" | "paypal" | "bank_transfer" | "crypto";

// --- Interface for PaymentTransaction Document ---
export interface IPaymentTransaction extends Document {
  userId: Types.ObjectId;
  transactionId: string;
  paymentMethod: TransactionMethod;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  initiatedAt: Date;
  completedAt?: Date;
  paymentGatewayResponse?: Record<string, unknown>;
  isRefundable: boolean;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isCompleted: boolean;

  // Instance methods
  markAsCompleted(): Promise<void>;
  markAsFailed(reason: string): Promise<void>;
  initiateRefund(reason: string): Promise<IPaymentTransaction>;
}

// --- Model Interface for Statics ---
export interface IPaymentTransactionModel extends Model<IPaymentTransaction> {
  findByUser(userId: Types.ObjectId): Promise<IPaymentTransaction[]>;
  getTotalAmountForUser(userId: Types.ObjectId): Promise<number>;
}

// --- Schema Definition ---
const PaymentTransactionSchema = new Schema<IPaymentTransaction, IPaymentTransactionModel>(
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
      type: Schema.Types.Mixed,
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
  }
);

// --- Pre-save Hook ---
PaymentTransactionSchema.pre<IPaymentTransaction>("save", function (next) {
  if (this.amount <= 0) {
    return next(new Error("Transaction amount must be greater than zero."));
  }
  next();
});

// --- Instance Methods ---
PaymentTransactionSchema.methods.markAsCompleted = async function (this: IPaymentTransaction): Promise<void> {
  this.status = "completed";
  this.completedAt = new Date();
  await this.save();
};

PaymentTransactionSchema.methods.markAsFailed = async function (this: IPaymentTransaction,
  reason: string
): Promise<void> {
  this.status = "failed";
  this.description = `Failed: ${reason}`;
  await this.save();
};

PaymentTransactionSchema.methods.initiateRefund = async function (this: IPaymentTransaction,
  reason: string
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

// --- Static Methods ---
PaymentTransactionSchema.statics.findByUser = function (
  userId: Types.ObjectId
): Promise<IPaymentTransaction[]> {
  return this.find({ userId }).sort({ initiatedAt: -1 });
};

PaymentTransactionSchema.statics.getTotalAmountForUser = async function (
  userId: Types.ObjectId
): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
    { $group: { _id: "$userId", totalAmount: { $sum: "$amount" } } },
  ]);
  return result.length > 0 ? result[0].totalAmount : 0;
};

// --- Virtuals ---
PaymentTransactionSchema.virtual("isCompleted").get(function (): boolean {
  return this.status === "completed";
});

// --- Model Export ---
export const PaymentTransaction = mongoose.model<
  IPaymentTransaction,
  IPaymentTransactionModel
>("PaymentTransaction", PaymentTransactionSchema);
