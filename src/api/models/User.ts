import type { Document, Types, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ISubscription } from "./Subscription"; // import the real subscription interface

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

export interface ChatPreferences {
  preferredGroups?: Types.ObjectId[];
  directMessagesOnly?: boolean;
}

// Define subscription status enums
export type SubscriptionStatus = "trial" | "active" | "expired";
export type SubscriptionTier = "basic" | "premium" | "pro";

// Update your User model interface and schema

// Add these to your IUser interface (around line 20-30)
// Update your User model interface and schema

// Add these to your IUser interface (around line 20-30)
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  bio?: string;
  profileImage?: string;
  profilePicture?: string; // Add alias for compatibility
  coverImage?: string;
  role: "user" | "admin" | "moderator" | "military";
  isVerified: boolean;
  isAdmin: boolean;
  permissions: string[];
  isLocked?: boolean;
  active: boolean;
  isActive?: boolean; // Add alias for active status
  friends: Types.ObjectId[];
  friendRequests: Types.ObjectId[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  points: number;
  rewards: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  twoFactorSecret?: string;
  firstName?: string;
  lastName?: string;
  subscriptions?: (Types.ObjectId | ISubscription)[];
  stripeCustomerId?: string;
  subscription_status: SubscriptionStatus;
  subscriptionTier?: SubscriptionTier;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trial_start_date?: Date;
  next_billing_date?: Date;

  interests?: string[];
  chatPreferences?: ChatPreferences;

  // NEW FIELDS FOR RECOMMENDATIONS
  goals?: Array<{
    _id?: Types.ObjectId;
    title: string;
    category: "fitness" | "study" | "career" | "personal" | "health" | "finance" | "hobby" | "travel";
    description?: string;
    targetDate?: Date;
    status?: "active" | "completed" | "paused";
    priority?: "low" | "medium" | "high";
    createdAt?: Date;
    updatedAt?: Date;
  }>;

  location?: {
    country?: string;
    state?: string;
    city?: string;
    timezone?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };

  preferences?: {
    language?: string;
    theme?: "light" | "dark" | "auto";
    publicProfile?: boolean;
    showLocation?: boolean;
    showGoals?: boolean;
    showInterests?: boolean;
  };

  completedGoals?: number;
  streak?: number;
  streakCount: number;
  lastGoalCompletedAt?: Date;
  badges?: Types.ObjectId[];
  achievements?: Types.ObjectId[];
  pinnedGoals: Types.ObjectId[];
  featuredAchievements: Types.ObjectId[];

  settings?: UserSettings;

  activeStatus: "online" | "offline";
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
  updatePoints(pointsToAdd: number): Promise<void>;
  updateStreak(): Promise<void>;
  awardBadge(badgeId: Types.ObjectId): Promise<void>;
}

// Add these fields to your UserSchema (around line 90-120)

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8, select: false },
    bio: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    //profilePicture: { type: String, default: "" }, // Add for compatibility
    coverImage: { type: String, default: "" },
    firstName: { type: String },
    lastName: { type: String },
    role: { type: String, enum: ["user", "admin", "moderator", "military"], default: "user" },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
    isLocked: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    //isActive: { type: Boolean, default: true }, // Add alias

    // Relationships
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reward" }],
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
    pinnedGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    featuredAchievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],

    // NEW RECOMMENDATION FIELDS
    goals: [{
      title: { type: String, required: true },
      category: {
        type: String,
        enum: ["fitness", "study", "career", "personal", "health", "finance", "hobby", "travel"],
        required: true
      },
      description: { type: String },
      targetDate: { type: Date },
      status: {
        type: String,
        enum: ["active", "completed", "paused"],
        default: "active"
      },
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],

    location: {
      country: { type: String },
      state: { type: String },
      city: { type: String },
      timezone: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    },

    preferences: {
      language: { type: String, default: "en" },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light"
      },
      publicProfile: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: false },
      showGoals: { type: Boolean, default: true },
      showInterests: { type: Boolean, default: true }
    },

    // Stripe / Subscriptions
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subscription" }],
    stripeCustomerId: { type: String },
    subscription_status: {
      type: String,
      enum: ["trial", "active", "expired"],
      default: "trial",
    },
    subscriptionTier: {
      type: String,
      enum: ["basic", "premium", "pro"],
      default: "basic",
    },
    trial_start_date: { type: Date, default: null },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null },
    next_billing_date: { type: Date, default: null },

    // Gamification & Activity
    completedGoals: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    lastGoalCompletedAt: { type: Date, default: null },

    // Communication & Interests
    interests: [{ type: String }],
    chatPreferences: {
      preferredGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chat" }],
      directMessagesOnly: { type: Boolean, default: false },
    },

    activeStatus: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },

    // Security
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // Settings
    settings: {
      notifications: {
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        enableNotifications: { type: Boolean, default: false },
      },
      privacy: {
        profileVisibility: { type: String, enum: ["public", "friends", "private"], default: "public" },
        searchVisibility: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

// Add new indexes for recommendation performance
UserSchema.index({ interests: 1 });
UserSchema.index({ activeStatus: 1 });
UserSchema.index({ "goals.category": 1 }); // NEW
UserSchema.index({ "location.city": 1 }); // NEW
UserSchema.index({ "location.country": 1 }); // NEW
UserSchema.index({ active: 1, isActive: 1 }); // NEW

// Add these virtual fields and middleware after your schema definition

// Virtual field to sync profilePicture with profileImage
UserSchema.virtual("profilePicture").get(function() {
  return this.profileImage || "/default-avatar.png";
});

UserSchema.virtual("profilePicture").set(function(value: string) {
  this.profileImage = value;
});

// Virtual field to sync isActive with active
UserSchema.virtual("isActive").get(function() {
  return this.active;
});

UserSchema.virtual("isActive").set(function(value: boolean) {
  this.active = value;
});

// Pre-save middleware to update goals updatedAt
UserSchema.pre("save", function(next) {
  if (this.isModified("goals")) {
    this.goals?.forEach(goal => {
      if (!goal.createdAt) goal.createdAt = new Date();
      goal.updatedAt = new Date();
    });
  }
  next();
});

// Make sure virtuals are included in JSON output
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });
// Password hashing
UserSchema.pre<IUser>(
  "save",
  async function (this: IUser, next: (err?: CallbackError) => void): Promise<void> {
    if (!this.isModified("password") || this.password.startsWith("$2")) {
      return next();
    }
    try {
      const rounds = parseInt(process.env.SALT_ROUNDS ?? "10", 10);
      this.password = await bcrypt.hash(this.password, rounds);
      this.streak = Math.max(this.streak ?? 0, 0);
      next();
    } catch (err) {
      next(err as CallbackError);
    }
  }
);

// Methods
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateResetToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

UserSchema.methods.updatePoints = async function (
  pointsToAdd: number
): Promise<void> {
  this.points += pointsToAdd;
  await this.save();
};

UserSchema.methods.updateStreak = async function (): Promise<void> {
  const today = new Date();
  if (!this.lastGoalCompletedAt || this.lastGoalCompletedAt.toDateString() !== today.toDateString()) {
    this.streak += 1;
  } else {
    this.streak = 0;
  }
  this.lastGoalCompletedAt = today;
  await this.save();
};

UserSchema.methods.awardBadge = async function (
  badgeId: Types.ObjectId
): Promise<void> {
  if (!this.badges.includes(badgeId)) {
    this.badges.push(badgeId);
    await this.save();
  }
};

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
