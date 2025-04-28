import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Message Subdocument Interface ---
export interface ITicketMessage {
  sender: string;    // Could be a user ID or system
  content: string;
  timestamp: Date;
}

// --- Support Ticket Document Interface ---
export interface ISupportTicket extends Document {
  name: string;                 // Requester name
  email: string;                // Requester email
  subject: string;              // Ticket subject
  message: string;              // Initial message
  priority: "low" | "normal" | "high";
  status: "open" | "pending" | "closed";
  messages: ITicketMessage[];   // Thread of follow-up messages
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addMessage(sender: string, content: string): Promise<ISupportTicket>;
  setStatus(status: "open" | "pending" | "closed"): Promise<ISupportTicket>;
}

// --- Model Static Interface ---
export interface ISupportTicketModel extends Model<ISupportTicket> {
  findByStatus(status: string): Promise<ISupportTicket[]>;
  findByEmail(email: string): Promise<ISupportTicket[]>;
}

// --- Message Subdocument Schema ---
const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    sender: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { _id: false }
);

// --- Support Ticket Schema ---
const SupportTicketSchema = new Schema<ISupportTicket, ISupportTicketModel>(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, trim: true, lowercase: true, index: true },
    subject:    { type: String, required: true, trim: true },
    message:    { type: String, required: true, trim: true },
    priority:   { type: String, enum: ["low", "normal", "high"], default: "normal", index: true },
    status:     { type: String, enum: ["open", "pending", "closed"], default: "open", index: true },
    messages:   { type: [TicketMessageSchema], default: [] },
  },
  { timestamps: true }
);

// --- Indexes ---
SupportTicketSchema.index({ email: 1, status: 1 });

// --- Instance Methods ---
SupportTicketSchema.methods.addMessage = async function (
  this: ISupportTicket,
  sender: string,
  content: string
): Promise<ISupportTicket> {
  this.messages.push({ sender, content, timestamp: new Date() });
  return this.save();
};

SupportTicketSchema.methods.setStatus = async function (
  this: ISupportTicket,
  status: "open" | "pending" | "closed"
): Promise<ISupportTicket> {
  this.status = status;
  return this.save();
};

// --- Static Methods ---
SupportTicketSchema.statics.findByStatus = function (
  this: ISupportTicketModel,
  status: string
): Promise<ISupportTicket[]> {
  return this.find({ status }).sort({ updatedAt: -1 }).exec();
};

SupportTicketSchema.statics.findByEmail = function (
  this: ISupportTicketModel,
  email: string
): Promise<ISupportTicket[]> {
  return this.find({ email: email.toLowerCase() }).sort({ createdAt: -1 }).exec();
};

// --- Model Export ---
export const SupportTicket = mongoose.model<ISupportTicket, ISupportTicketModel>(
  "SupportTicket",
  SupportTicketSchema
);

export default SupportTicket;
