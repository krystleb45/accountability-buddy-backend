import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IHistory extends Document {
  entity: string; // E.g., "User", "Goal", "Task", etc.
  action: string; // E.g., "Created", "Updated", "Deleted", etc.
  details: string; // Additional information about the action
  createdAt: Date;
}

const HistorySchema: Schema = new Schema({
  entity: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const History = mongoose.model<IHistory>("History", HistorySchema);

export default History;
