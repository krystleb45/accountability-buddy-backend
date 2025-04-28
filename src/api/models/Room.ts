import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Room Document Interface ---
export interface IRoom extends Document {
  name: string;                     // Room name
  description?: string;             // Optional description
  isPrivate: boolean;               // Visibility flag
  createdBy: Types.ObjectId;        // Creator's user ID
  members: Types.ObjectId[];        // Room members
  createdAt: Date;                  // Auto-added
  updatedAt: Date;                  // Auto-added

  // Instance methods
  addMember(userId: Types.ObjectId): Promise<IRoom>;
  removeMember(userId: Types.ObjectId): Promise<IRoom>;
  hasMember(userId: Types.ObjectId): boolean;
}

// --- Room Model Static Interface ---
export interface IRoomModel extends Model<IRoom> {
  findByName(name: string): Promise<IRoom | null>;
  findPublic(): Promise<IRoom[]>;
  findByUser(userId: Types.ObjectId): Promise<IRoom[]>;
}

// --- Room Schema Definition ---
const RoomSchema = new Schema<IRoom, IRoomModel, IRoom>(
  {
    name: {
      type: String,
      required: [true, "Room name is required."],
      minlength: [3, "Room name must be at least 3 characters long."],
      maxlength: [50, "Room name cannot exceed 50 characters."],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [300, "Description cannot exceed 300 characters."],
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required."],
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Hooks ---
// Ensure creator is always a member
RoomSchema.pre<IRoom>("save", function (next) {
  if (this.isNew || this.isModified("createdBy")) {
    const creatorId = this.createdBy;
    if (!this.members.some(m => m.equals(creatorId))) {
      this.members.push(creatorId);
    }
  }
  next();
});

// --- Instance Methods ---
RoomSchema.methods.addMember = async function (this: IRoom, userId: Types.ObjectId): Promise<IRoom> {
  if (!this.members.some(m => m.equals(userId))) {
    this.members.push(userId);
    await this.save();
  }
  return this;
};

RoomSchema.methods.removeMember = async function (this: IRoom, userId: Types.ObjectId): Promise<IRoom> {
  this.members = this.members.filter(m => !m.equals(userId));
  await this.save();
  return this;
};

RoomSchema.methods.hasMember = function (this: IRoom, userId: Types.ObjectId): boolean {
  return this.members.some(m => m.equals(userId));
};

// --- Static Methods ---
RoomSchema.statics.findByName = function (this: IRoomModel, name: string): Promise<IRoom | null> {
  return this.findOne({ name }).exec();
};

RoomSchema.statics.findPublic = function (this: IRoomModel): Promise<IRoom[]> {
  return this.find({ isPrivate: false }).sort({ createdAt: -1 }).exec();
};

RoomSchema.statics.findByUser = function (this: IRoomModel, userId: Types.ObjectId): Promise<IRoom[]> {
  return this.find({ members: userId }).sort({ updatedAt: -1 }).exec();
};

// --- Indexes ---
RoomSchema.index({ members: 1 });

// --- Model Export ---
export const Room = mongoose.model<IRoom, IRoomModel>("Room", RoomSchema);
export default Room;
