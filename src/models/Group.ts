import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Group interface
export interface IGroup extends Document {
  name: string;
  description?: string;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  visibility: "public" | "private";
  isActive: boolean;
  addMember(userId: mongoose.Types.ObjectId): Promise<void>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<void>;
}

// Define the Group schema
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
        index: true, // Optimize queries for members
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
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Middleware to ensure the creator is added as a member
GroupSchema.pre("save", function (next) {
  try {
    if (!this.members.includes(this.createdBy)) {
      this.members.push(this.createdBy);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to add a member
GroupSchema.methods.addMember = async function (
  userId: mongoose.Types.ObjectId,
): Promise<void> {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    await this.save();
  }
};

// Instance method to remove a member
GroupSchema.methods.removeMember = async function (
  userId: mongoose.Types.ObjectId,
): Promise<void> {
  this.members = this.members.filter(
    (member: mongoose.Types.ObjectId) => member.toString() !== userId.toString(),
  );
  await this.save();
};

// Static method to fetch public groups
GroupSchema.statics.findPublicGroups = async function (): Promise<IGroup[]> {
  return await this.find({ visibility: "public", isActive: true });
};

// Virtual field to get the member count
GroupSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// Indexes for optimization
GroupSchema.index({ name: 1, isActive: 1 }); // Optimize searches by name and activity
GroupSchema.index({ members: 1 }); // Optimize member-based queries
GroupSchema.index({ visibility: 1 }); // Optimize visibility-based queries

// Named export
export const Group: Model<IGroup> = mongoose.model<IGroup>("Group", GroupSchema);

// Default export
export default Group;
