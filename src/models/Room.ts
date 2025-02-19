import type { Document } from "mongoose";
import mongoose, { Schema, model } from "mongoose";

// Define the structure of a Room document
export interface IRoom extends Document {
  name: string; // Name of the room
  description?: string; // Optional description of the room
  isPrivate: boolean; // Whether the room is private
  createdBy: mongoose.Types.ObjectId; // User who created the room
  members: mongoose.Types.ObjectId[]; // Array of user IDs in the room
  createdAt: Date; // Timestamp for room creation
  updatedAt: Date; // Timestamp for last update
}

// Define the schema for a Room
const RoomSchema: Schema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, "Room name is required."],
      minlength: [3, "Room name must be at least 3 characters long."],
      maxlength: [50, "Room name cannot exceed 50 characters."],
    },
    description: {
      type: String,
      maxlength: [300, "Description cannot exceed 300 characters."],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy field is required."],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

// Create and export the Room model
const Room = model<IRoom>("Room", RoomSchema);
export default Room;
