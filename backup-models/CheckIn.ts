// src/api/models/CheckIn.ts
import mongoose, { Document, Model } from "mongoose";

export interface CheckInDocument extends Document {
  user: mongoose.Types.ObjectId;
  createdAt: Date;
}

const checkInSchema = new mongoose.Schema<CheckInDocument>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // If you ever want Mongoose to auto‐manage `createdAt` and `updatedAt`:
    // timestamps: true
    // but here we only need createdAt
    versionKey: false,
  }
);

const CheckIn: Model<CheckInDocument> = mongoose.model<CheckInDocument>(
  "CheckIn",
  checkInSchema
);

export default CheckIn;
