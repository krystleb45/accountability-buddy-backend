import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";
import logger from "../utils/winstonLogger"; // Optional: for logging

// Define TypeScript interface for Chat document
interface IChat extends Document {
  message: string;
  sender: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  deleted: boolean;
  edited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  softDelete: () => Promise<void>;
  editMessage: (newMessage: string) => Promise<void>;
  isActive: boolean;
}

// Define the Chat schema
const ChatSchema: Schema<IChat> = new Schema<IChat>(
  {
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"], // Limit message length for performance
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster querying
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true, // Index for faster querying
    },
    deleted: {
      type: Boolean,
      default: false, // Optional: For soft delete functionality
    },
    edited: {
      type: Boolean,
      default: false, // Track if the message was edited
    },
    editedAt: {
      type: Date, // Track the time when the message was edited
    },
  },
  {
    timestamps: true, // Automatically create `createdAt` and `updatedAt` fields
  },
);

// Add index for sorting and querying by date
ChatSchema.index({ createdAt: 1 });

// Pre-save hook to sanitize the message content
ChatSchema.pre<IChat>("save", function (next: (err?: Error) => void): void {
  this.message = sanitize(this.message); // Sanitize the message to prevent XSS or injection attacks
  next();
});

// Post-save hook for logging message creation (Optional)
ChatSchema.post<IChat>("save", function (doc: IChat): void {
  logger.info(
    `New chat message created by user ${doc.sender} in group ${doc.group}: ${doc.message}`,
  );
});

// Soft delete functionality: override the `remove` method
ChatSchema.methods.softDelete = async function (): Promise<void> {
  this.deleted = true;
  await this.save();
  logger.info(
    `Chat message soft-deleted by user ${this.sender} in group ${this.group}`,
  );
};

// Edit message functionality
ChatSchema.methods.editMessage = async function (newMessage: string): Promise<void> {
  if (newMessage.trim() === "") {
    throw new Error("Message cannot be empty");
  }

  this.message = sanitize(newMessage);
  this.edited = true;
  this.editedAt = new Date();
  await this.save();
  logger.info(
    `Chat message edited by user ${this.sender} in group ${this.group}: ${this.message}`,
  );
};

// Virtual to check if the message is active (not deleted)
ChatSchema.virtual("isActive").get(function (): boolean {
  return !this.deleted;
});

// Export the Chat model
const Chat: Model<IChat> = mongoose.model<IChat>("Chat", ChatSchema);
export default Chat;
