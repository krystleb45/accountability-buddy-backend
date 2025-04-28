import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Option Subdocument Interface ---
export interface IPollOption {
  _id: Types.ObjectId;
  option: string;
  votes: Types.ObjectId[];         // Users who voted for this option
}

// --- Poll Document Interface ---
export interface IPoll extends Document {
  groupId: Types.ObjectId;         // Group the poll belongs to
  question: string;                // Poll question
  options: Types.DocumentArray<IPollOption>;
  expirationDate: Date;            // When poll expires
  status: "active" | "expired"; // Poll status
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isExpired: boolean;
  totalVotes: number;

  // Instance methods
  vote(optionId: Types.ObjectId, userId: Types.ObjectId): Promise<IPoll>;
  close(): Promise<IPoll>;
}

// --- Model Interface for Statics ---
export interface IPollModel extends Model<IPoll> {
  getActive(): Promise<IPoll[]>;
  getExpired(): Promise<IPoll[]>;
  getByGroup(groupId: Types.ObjectId): Promise<IPoll[]>;
}

// --- Schema Definition ---
const PollSchema = new Schema<IPoll, IPollModel>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: [true, "Poll question is required"],
      trim: true,
      maxlength: [500, "Poll question cannot exceed 500 characters"],
    },
    options: [
      {
        option: { type: String, required: true, trim: true },
        votes: {
          type: [Schema.Types.ObjectId],
          ref: "User",
          default: [],
        },
      },
    ],
    expirationDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
PollSchema.index({ groupId: 1, status: 1, expirationDate: 1 });

// --- Virtuals ---
PollSchema.virtual("isExpired").get(function (this: IPoll): boolean {
  return new Date() > this.expirationDate;
});

PollSchema.virtual("totalVotes").get(function (this: IPoll): number {
  return this.options.reduce((sum, opt) => sum + opt.votes.length, 0);
});

// --- Instance Methods ---
PollSchema.methods.vote = async function (
  this: IPoll,
  optionId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IPoll> {
  if (this.isExpired || this.status !== "active") {
    throw new Error("Cannot vote on an expired or closed poll.");
  }
  // Remove existing vote
  this.options.forEach(opt => {
    opt.votes = opt.votes.filter(uid => !uid.equals(userId));
  });
  // Add vote to selected option
  const opt = this.options.id(optionId);
  if (!opt) throw new Error("Option not found");
  opt.votes.push(userId);
  await this.save();
  return this;
};

PollSchema.methods.close = async function (this: IPoll): Promise<IPoll> {
  this.status = "expired";
  await this.save();
  return this;
};

// --- Static Methods ---
PollSchema.statics.getActive = function (): Promise<IPoll[]> {
  return this.find({ status: "active", expirationDate: { $gt: new Date() } })
    .sort({ expirationDate: 1 });
};

PollSchema.statics.getExpired = function (): Promise<IPoll[]> {
  return this.find({ status: "expired" }).sort({ expirationDate: -1 });
};

PollSchema.statics.getByGroup = function (
  groupId: Types.ObjectId
): Promise<IPoll[]> {
  return this.find({ groupId }).sort({ createdAt: -1 });
};

// --- Pre-save Hook to auto-expire polls ---
PollSchema.pre<IPoll>("save", function (next) {
  if (this.expirationDate <= new Date()) {
    this.status = "expired";
  }
  next();
});

// --- Model Export ---
export const Poll = mongoose.model<IPoll, IPollModel>("Poll", PollSchema);
export default Poll;
