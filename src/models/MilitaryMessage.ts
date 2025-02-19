import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IMilitaryMessage extends Document {
  user: mongoose.Types.ObjectId;
  text: string;
  timestamp: Date;
}

const MilitaryMessageSchema: Schema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model<IMilitaryMessage>("MilitaryMessage", MilitaryMessageSchema);
