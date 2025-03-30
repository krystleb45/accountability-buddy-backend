import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IMilitaryResource extends Document {
  title: string;
  url: string;
  description?: string;
  createdAt: Date;
}

const MilitaryResourceSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model<IMilitaryResource>("MilitaryResource", MilitaryResourceSchema);
