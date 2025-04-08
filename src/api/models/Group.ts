import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Group interface with unreadMessages
export interface IGroup extends Document {
  _id: mongoose.Types.ObjectId; // ✅ Explicitly define `_id` to fix `unknown` type errors
  name: string;
  description?: string;
  members: mongoose.Types.ObjectId[]; // Array of user IDs
  createdBy: mongoose.Types.ObjectId; // Creator of the group
  visibility: "public" | "private"; // Determines if the group is public or private
  isActive: boolean; // If the group is active
  unreadMessages: { userId: mongoose.Types.ObjectId; count: number }[]; // Track unread messages for each user
  typingUsers: mongoose.Types.ObjectId[]; // Users currently typing in the group
  isPinned: boolean; // Allows users to pin the group
  addMember(userId: mongoose.Types.ObjectId): Promise<void>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<void>;
}

// Define the Group schema with unreadMessages
const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimize queries for group creator
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    isActive: {
      type: Boolean,
      default: true, // Mark group as active by default
    },
    unreadMessages: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        count: { type: Number, default: 0 },
      },
    ],
    typingUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Ensure `createdBy` is added to `members` when creating a new group
GroupSchema.pre("save", function (next) {
  try {
    if (!this.members.some((member) => member.equals(this.createdBy))) {
      this.members.push(this.createdBy);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ✅ Instance method to add a member
GroupSchema.methods.addMember = async function (
  userId: mongoose.Types.ObjectId
): Promise<void> {
  if (!this.members.some((member: { equals: (arg0: mongoose.Types.ObjectId) => any }) => member.equals(userId))) {
    this.members.push(userId);
    await this.save();
  }
};

// ✅ Instance method to remove a member
GroupSchema.methods.removeMember = async function (
  userId: mongoose.Types.ObjectId
): Promise<void> {
  this.members = this.members.filter(
    (member: mongoose.Types.ObjectId) => !member.equals(userId)
  );
  await this.save();
};

// ✅ Static method to fetch public groups
GroupSchema.statics.findPublicGroups = async function (): Promise<IGroup[]> {
  return await this.find({ visibility: "public", isActive: true }).lean();
};

// ✅ Virtual field to get the member count
GroupSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// ✅ Indexes for optimization
GroupSchema.index({ name: 1, isActive: 1 }); // Optimize searches by name and activity
GroupSchema.index({ members: 1 }); // Optimize member-based queries
GroupSchema.index({ visibility: 1 }, { sparse: true }); // Optimize visibility-based queries
GroupSchema.index({ "unreadMessages.userId": 1 }); // Optimize unread message tracking

// Named export
export const Group: Model<IGroup> = mongoose.model<IGroup>("Group", GroupSchema);

// Default export
export default Group;
