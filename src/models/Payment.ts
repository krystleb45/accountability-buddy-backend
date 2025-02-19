import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Payment interface
export interface IPayment extends Document {
  userId: Types.ObjectId;
  paymentId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  method: "card" | "paypal" | "bank_transfer";
  description?: string;
  receiptUrl?: string;
  paymentDate: Date;
  expiresAt?: Date;
  markAsCompleted: () => Promise<void>;
  markAsFailed: (reason: string) => Promise<void>;
  isExpired: boolean; // Virtual field
}

// Extend the model interface for custom static methods
interface IPaymentModel extends Model<IPayment> {
  findByUser: (userId: Types.ObjectId) => Promise<IPayment[]>;
  getTotalPaymentsForUser: (userId: Types.ObjectId) => Promise<number>;
  refundPayment: (paymentId: string) => Promise<void>;
}

// Define the schema with an explicit return type
const PaymentSchema: Schema<IPayment> = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimize queries by user
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Unique identifier for each payment
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => value > 0,
        message: "Payment amount must be greater than zero.",
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true, // Ensure uppercase currency codes
      maxlength: 3,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true, // Optimize filtering by status
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
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);


// Pre-save hook to validate amount and handle expiration
PaymentSchema.pre("save", function (next): void {
  if (this.amount <= 0) {
    return next(new Error("Payment amount must be greater than zero."));
  }

  if (this.expiresAt instanceof Date && this.expiresAt < new Date()) {
    this.status = "failed";
  }
  next();
});

// Instance method to mark payment as completed
PaymentSchema.methods.markAsCompleted = async function (): Promise<void> {
  this.status = "completed";
  await this.save();
};

// Instance method to mark payment as failed
PaymentSchema.methods.markAsFailed = async function (reason: string): Promise<void> {
  this.status = "failed";
  this.description = `Failed: ${reason}`;
  await this.save();
};

// Static method to find payments by user
PaymentSchema.statics.findByUser = function (userId: Types.ObjectId): Promise<IPayment[]> {
  return this.find({ userId }).sort({ paymentDate: -1 });
};

// Static method to calculate total completed payments for a user
PaymentSchema.statics.getTotalPaymentsForUser = async function (userId: Types.ObjectId): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
    { $group: { _id: "$userId", totalAmount: { $sum: "$amount" } } },
  ]);
  return result.length > 0 ? result[0].totalAmount : 0;
};

// Static method to refund a payment
PaymentSchema.statics.refundPayment = async function (paymentId: string): Promise<void> {
  const payment = await this.findOne({ paymentId });
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (payment.status !== "completed") {
    throw new Error("Only completed payments can be refunded");
  }

  // Logic to handle refund via payment gateway (e.g., Stripe, PayPal)
  payment.status = "refunded";
  await payment.save();
};

// Virtual field to check if the payment is expired
PaymentSchema.virtual("isExpired").get(function (): boolean {
  return !!this.expiresAt && this.expiresAt instanceof Date && this.expiresAt < new Date();
});


// Export the Payment model
const Payment: IPaymentModel = mongoose.model<IPayment, IPaymentModel>(
  "Payment",
  PaymentSchema,
);

export default Payment;
