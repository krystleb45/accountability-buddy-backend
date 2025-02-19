import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Message Schema for Military Support Chat
interface IMessage extends Document {
  sender: mongoose.Schema.Types.ObjectId; // User ID
  content: string;
  timestamp: Date;
}

// Military User Schema
interface IMilitaryUser extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Linked to User
  isMilitary: boolean; // Verification flag
  messages: IMessage[];
}

// Message Schema
const MessageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Military User Schema
const MilitaryUserSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isMilitary: { type: Boolean, default: false },
  messages: [MessageSchema],
});

const MilitaryUser = mongoose.model<IMilitaryUser>(
  "MilitaryUser",
  MilitaryUserSchema,
);
export default MilitaryUser;
