import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define TypeScript interfaces
interface IMilestone {
  title: string;
  dueDate: Date;
  completed: boolean;
}

interface ICollaborationGoal extends Document {
  goalTitle: string;
  description: string;
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  target: number;
  progress: number;
  status: "pending" | "in-progress" | "completed" | "canceled";
  completedAt?: Date;
  milestones: IMilestone[];
  visibility: "public" | "private";
  createdAt: Date;
  updatedAt: Date;
  updateProgress: (newProgress: number) => Promise<void>;
}

interface ICollaborationGoalModel extends Model<ICollaborationGoal> {
  addParticipant(goalId: string, userId: Types.ObjectId): Promise<ICollaborationGoal>;
  completeMilestone(goalId: string, milestoneIndex: number): Promise<ICollaborationGoal>;
}

// Define the schema
const CollaborationGoalSchema: Schema<ICollaborationGoal> = new Schema(
  {
    goalTitle: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: [100, "Goal title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    target: {
      type: Number,
      required: [true, "Target value for goal progress is required"],
      min: [1, "Target must be at least 1"],
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be less than 0"],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "canceled"],
      default: "pending",
    },
    completedAt: {
      type: Date,
    },
    milestones: [
      {
        title: {
          type: String,
          required: [true, "Milestone title is required"],
        },
        dueDate: {
          type: Date,
          required: [true, "Milestone due date is required"],
        },
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
  },
  { timestamps: true }, // Automatically create `createdAt` and `updatedAt` fields
);

// Middleware to add the creator as a default participant
CollaborationGoalSchema.pre<ICollaborationGoal>("save", function (next): void {
  if (!this.participants.includes(this.createdBy)) {
    this.participants.push(this.createdBy);
  }
  next();
});

// Instance method to update goal progress
CollaborationGoalSchema.methods.updateProgress = async function (newProgress: number): Promise<void> {
  this.progress = Math.min(this.progress + newProgress, this.target); // Cap progress at target
  if (this.progress >= this.target) {
    this.status = "completed";
    this.completedAt = new Date();
  } else {
    this.status = "in-progress";
  }
  await this.save();
};

// Static method to add participants
CollaborationGoalSchema.statics.addParticipant = async function (
  goalId: string,
  userId: Types.ObjectId,
): Promise<ICollaborationGoal> {
  const goal = await this.findById(goalId);
  if (!goal) throw new Error("Collaboration goal not found");

  if (!goal.participants.includes(userId)) {
    goal.participants.push(userId);
    await goal.save();
  }
  return goal;
};

// Static method to update milestone completion
CollaborationGoalSchema.statics.completeMilestone = async function (
  goalId: string,
  milestoneIndex: number,
): Promise<ICollaborationGoal> {
  const goal = await this.findById(goalId);
  if (!goal) throw new Error("Collaboration goal not found");

  const milestone = goal.milestones[milestoneIndex];
  if (!milestone) throw new Error("Milestone not found");

  milestone.completed = true;
  await goal.save();
  return goal;
};

// Virtual to get the number of participants
CollaborationGoalSchema.virtual("participantCount").get(function (): number {
  return this.participants.length;
});

// Export the CollaborationGoal model
const CollaborationGoal = mongoose.model<ICollaborationGoal, ICollaborationGoalModel>(
  "CollaborationGoal",
  CollaborationGoalSchema,
);

export default CollaborationGoal;
