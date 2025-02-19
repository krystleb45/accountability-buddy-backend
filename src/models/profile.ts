import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the interface for the Profile document
interface IProfile extends Document {
  user: mongoose.Schema.Types.ObjectId; // Reference to the User model
  name: string;
  email: string;
  bio?: string; // Optional field
  profilePicture?: string; // Optional URL for profile picture
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema for Profile
const ProfileSchema: Schema<IProfile> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // References the User model
      required: true,
      unique: true, // Ensure one profile per user
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/\S+@\S+\.\S+/, "Invalid email address"], // Enforces email format
    },
    bio: {
      type: String,
      maxlength: 500, // Limit bio to 500 characters
    },
    profilePicture: {
      type: String, // URL of the profile picture
      default: "", // Optional
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Pre-save middleware to ensure email uniqueness and lowercase
ProfileSchema.pre<IProfile>("save", async function (next) {
  this.email = this.email.toLowerCase(); // Ensure lowercase email
  next();
});

// Static method to fetch profile by user ID
ProfileSchema.statics.findByUserId = async function (
  userId: string,
): Promise<IProfile | null> {
  return this.findOne({ user: userId });
};

// Export the Profile model
const Profile: Model<IProfile> = mongoose.model<IProfile>("Profile", ProfileSchema);

export default Profile;
