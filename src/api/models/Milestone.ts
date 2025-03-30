import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IMilestone extends Document {
  title: string;
  description: string;
  dueDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const MilestoneSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true },
);

const Milestone = mongoose.model<IMilestone>("Milestone", MilestoneSchema);

export default Milestone;
