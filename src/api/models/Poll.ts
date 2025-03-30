import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Poll interface
export interface IPoll extends Document {
  groupId: mongoose.Types.ObjectId; // The group to which the poll belongs
  question: string; // The poll question
  options: {
    _id: any;
    option: string;
    votes: mongoose.Types.ObjectId[]; // Array of user ObjectIds who voted for the option
  }[]; // Poll options with vote count
  expirationDate: Date; // Date when the poll expires
  status: "active" | "expired"; // Poll status
  createdAt: Date;
  updatedAt: Date;
}

// Define the Poll schema
const PollSchema: Schema<IPoll> = new Schema<IPoll>(
  {
    groupId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Group", 
      required: true,
      index: true, // Indexed for faster group-related queries
    },
    question: {
      type: String,
      required: [true, "Poll question is required"],
      trim: true,
      maxlength: [500, "Poll question cannot exceed 500 characters"],
    },
    options: [
      {
        option: { 
          type: String, 
          required: true, 
          trim: true 
        },
        votes: { 
          type: [mongoose.Schema.Types.ObjectId],  // Array of user ObjectIds
          ref: "User",  // Referring to the User model for better relationships
          default: [] 
        },
      },
    ],
    expirationDate: {
      type: Date,
      required: true,
      index: true, // Indexed for fast expiration checks
    },
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for checking if the poll is expired
PollSchema.virtual("isExpired").get(function (this: IPoll) {
  return new Date() > new Date(this.expirationDate);
});

// Export the Poll model
const Poll: Model<IPoll> = mongoose.model<IPoll>("Poll", PollSchema);

export default Poll;
