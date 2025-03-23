import type { Document, Types, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * ✅ User Settings Interface
 */
export interface UserSettings {
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    enableNotifications?: boolean;
  };
  privacy?: {
    profileVisibility?: "public" | "friends" | "private";
    searchVisibility?: boolean;
  };
}

/**
 * ✅ Chat Preferences Interface
 */
export interface ChatPreferences {
  preferredGroups?: Types.ObjectId[];
  directMessagesOnly?: boolean;
}

/**
 * ✅ User Interface
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username: string;
  email: string;
  password: string;
  role: "user" | "admin" | "moderator";
  isVerified: boolean;
  isLocked?: boolean;
  active: boolean;
  profilePicture?: string;
  friends: Types.ObjectId[];
  friendRequests: Types.ObjectId[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  points?: number;
  rewards: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  subscriptions?: Types.ObjectId[];
  settings?: UserSettings;
  twoFactorSecret?: string;
  completedGoals?: number;
  streak?: number;
  streakCount?: number; // ✅ Added for gamification streak logic
  badges?: Types.ObjectId[]; // ✅ Added to support awarded badge references
  achievements?: Types.ObjectId[];
  lastGoalCompletedAt?: Date;
  trial_start_date?: Date;
  subscription_status: "trial" | "active" | "expired";
  next_billing_date?: Date;
  stripeCustomerId?: string;
  interests?: string[];
  chatPreferences?: ChatPreferences;
  activeStatus: "online" | "offline";

  // ✅ Pinned Goals & Featured Achievements
  pinnedGoals: Types.ObjectId[];
  featuredAchievements: Types.ObjectId[];

  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
}

/**
 * ✅ Define User Schema
 */
const UserSchema: Schema<IUser> = new Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    profilePicture: { type: String },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    points: { type: Number, default: 0 },
    rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reward" }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subscription" }],
    stripeCustomerId: { type: String },

    trial_start_date: { type: Date, default: null },
    subscription_status: { type: String, enum: ["trial", "active", "expired"], default: "trial" },
    next_billing_date: { type: Date, default: null },

    completedGoals: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    streakCount: { type: Number, default: 0, min: 0 }, // ✅ NEW
    lastGoalCompletedAt: { type: Date, default: null },

    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }], // ✅ NEW

    pinnedGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    featuredAchievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],

    interests: [{ type: String, trim: true }],
    chatPreferences: {
      preferredGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chat" }],
      directMessagesOnly: { type: Boolean, default: false },
    },
    activeStatus: { type: String, enum: ["online", "offline"], default: "offline" },
  },
  { timestamps: true }
);

/**
 * ✅ Indexes
 */
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ interests: 1 });
UserSchema.index({ activeStatus: 1 });
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });

/**
 * ✅ Password hashing & streak fix
 */
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.streak = Math.max(this.streak ?? 0, 0);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

/**
 * ✅ Compare password method
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * ✅ Generate password reset token
 */
UserSchema.methods.generateResetToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

/**
 * ✅ Export the model
 */
const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
