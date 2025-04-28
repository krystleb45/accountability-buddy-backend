import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Payment Status & Method Types ---
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod = "card" | "paypal" | "bank_transfer";

// --- Interface for Payment Document ---
export interface IPayment extends Document {
  userId: Types.ObjectId;
  paymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  description?: string;
  receiptUrl?: string;
  paymentDate: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isExpired: boolean;

  // Instance methods
  markAsCompleted(): Promise<void>;
  markAsFailed(reason: string): Promise<void>;
}

// --- Model Interface for Statics ---
export interface IPaymentModel extends Model<IPayment> {
  findByUser(userId: Types.ObjectId): Promise<IPayment[]>;
  getTotalPaymentsForUser(userId: Types.ObjectId): Promise<number>;
  refundPayment(paymentId: string): Promise<void>;
}

// --- Schema Definition ---
const PaymentSchema = new Schema<IPayment, IPaymentModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: function (value: number): boolean {
          return value > 0;
        },
        message: "Payment amount must be greater than zero.",
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
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    method: {
      type: String,
      enum: ["card", "paypal", "bank_transfer"],
      required: true,
    },
    description: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Pre-save Hook ---
PaymentSchema.pre<IPayment>("save", function (next) {
  if (this.amount <= 0) {
    return next(new Error("Payment amount must be greater than zero."));
  }
  if (this.expiresAt instanceof Date && this.expiresAt < new Date()) {
    this.status = "failed";
  }
  next();
});

// --- Instance Methods ---
PaymentSchema.methods.markAsCompleted = async function (): Promise<void> {
  this.status = "completed";
  await this.save();
};

PaymentSchema.methods.markAsFailed = async function (reason: string): Promise<void> {
  this.status = "failed";
  this.description = `Failed: ${reason}`;
  await this.save();
};

// --- Static Methods ---
PaymentSchema.statics.findByUser = function (userId: Types.ObjectId): Promise<IPayment[]> {
  return this.find({ userId }).sort({ paymentDate: -1 });
};

PaymentSchema.statics.getTotalPaymentsForUser = async function (userId: Types.ObjectId): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
    { $group: { _id: "$userId", totalAmount: { $sum: "$amount" } } },
  ]);
  return result.length > 0 ? result[0].totalAmount : 0;
};

PaymentSchema.statics.refundPayment = async function (paymentId: string): Promise<void> {
  const payment = await this.findOne({ paymentId });
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (payment.status !== "completed") {
    throw new Error("Only completed payments can be refunded");
  }
  payment.status = "refunded";
  await payment.save();
};

// --- Virtuals ---
PaymentSchema.virtual("isExpired").get(function (this: IPayment): boolean {
  return !!this.expiresAt && this.expiresAt < new Date();
});

// --- Model Export ---
export const Payment = mongoose.model<IPayment, IPaymentModel>("Payment", PaymentSchema);
export default Payment;
