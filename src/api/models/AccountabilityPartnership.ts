import type { Document, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for Milestones
interface Milestone {
  description: string;
  deadline: Date;
  completed: boolean;
  progressUpdates: string[];
}

// Interface for AccountabilityPartnership
export interface AccountabilityPartnership extends Document {
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  status: "pending" | "active" | "completed" | "canceled";
  goal: string;
  milestones: Milestone[];
  progress: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean; // Virtual property
}

// Define Milestone Schema
const MilestoneSchema = new Schema<Milestone>({
  description: {
    type: String,
    required: [true, "Milestone description is required"],
    trim: true,
    maxlength: [100, "Milestone description cannot exceed 100 characters"],
  },
  deadline: {
    type: Date,
    required: [true, "Milestone deadline is required"],
    validate: {
      validator: function (this: Milestone, v: Date): boolean {
        return v > new Date(); // Ensure deadline is in the future
      },
      message: "Milestone deadline must be in the future",
    },
  },
  completed: { type: Boolean, default: false },
  progressUpdates: [
    {
      type: String,
      trim: true,
    },
  ],
});

// Define AccountabilityPartnership Schema
const AccountabilityPartnershipSchema = new Schema<AccountabilityPartnership>(
  {
    user1: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: function (
          this: AccountabilityPartnership,
          v: mongoose.Types.ObjectId,
        ): boolean {
          return v.toString() !== this.user1.toString(); // Ensure user1 and user2 are different
        },
        message: "User1 and User2 cannot be the same person",
      },
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "canceled"],
      default: "pending",
    },
    goal: {
      type: String,
      required: [true, "A shared goal description is required"],
      trim: true,
      maxlength: [200, "Goal description cannot exceed 200 characters"],
    },
    milestones: [MilestoneSchema],
    progress: {
      type: String,
      trim: true,
      maxlength: [500, "Progress updates cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index to quickly find accountability partnerships for users
AccountabilityPartnershipSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Virtual field for checking if the partnership is active
AccountabilityPartnershipSchema.virtual("isActive").get(function (
  this: AccountabilityPartnership,
): boolean {
  return this.status === "active";
});

// Pre-save hook to prevent duplicate active/pending partnerships between the same users
AccountabilityPartnershipSchema.pre("save", async function (
  next: (err?: CallbackError) => void,
): Promise<void> {
  const doc = this as AccountabilityPartnership;

  if (doc.status === "completed" || doc.status === "canceled") {
    return next();
  }

  try {
    const existingPartnership = await mongoose
      .model<AccountabilityPartnership>("AccountabilityPartnership")
      .findOne({
        $or: [
          { user1: doc.user1, user2: doc.user2 },
          { user1: doc.user2, user2: doc.user1 },
        ],
        status: { $in: ["active", "pending"] },
      });

    if (existingPartnership) {
      return next(
        new Error(
          "An active or pending partnership between these users already exists.",
        ),
      );
    }

    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Export the model
const AccountabilityPartnership: Model<AccountabilityPartnership> =
  mongoose.model<AccountabilityPartnership>(
    "AccountabilityPartnership",
    AccountabilityPartnershipSchema,
  );

export default AccountabilityPartnership;
