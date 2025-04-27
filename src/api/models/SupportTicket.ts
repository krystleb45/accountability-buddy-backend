import mongoose, { Document, Schema } from "mongoose";

export interface IMessage {
  sender: string;
  content: string;
  timestamp: Date;
}

export interface ISupportTicket extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: "low" | "normal" | "high";
  status: "open" | "pending" | "closed";
  createdAt: Date;
  updatedAt: Date;
  messages: IMessage[];
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    name:       { type: String, required: true },
    email:      { type: String, required: true },
    subject:    { type: String, required: true },
    message:    { type: String, required: true },
    priority:   { type: String, enum: ["low", "normal", "high"], default: "normal" },
    status:     { type: String, enum: ["open", "pending", "closed"], default: "open" },
    messages:   { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<ISupportTicket>(
  "SupportTicket",
  SupportTicketSchema
);
