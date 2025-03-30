import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import validator from "validator"; // Use validator for email validation

// Define the interface for the Newsletter document
export interface INewsletter extends Document {
  email: string;
  subscribedAt: Date;
  status: "subscribed" | "unsubscribed";
  unsubscribeToken?: string;
}

// Extend the model interface for custom static methods
interface INewsletterModel extends Model<INewsletter> {
  findOrCreate(email: string): Promise<INewsletter>;
}

// Define the schema
const newsletterSchema: Schema<INewsletter> = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Ensure no duplicate email entries
      trim: true,
      lowercase: true, // Always store email in lowercase
      validate: {
        validator: (email: string): boolean => validator.isEmail(email), // Use validator to check email format
        message: "Please provide a valid email address",
      },
    },
    subscribedAt: {
      type: Date,
      default: Date.now, // Track when the user subscribed
      index: true, // Index for sorting subscriptions by date
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"], // Track subscription status
      default: "subscribed",
    },
    unsubscribeToken: {
      type: String, // Token for unsubscribing securely
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);


// Middleware to ensure email is lowercased before saving
newsletterSchema.pre("save", function (next) {
  this.email = this.email.toLowerCase();
  next();
});

// Static method to find or create a subscription
newsletterSchema.statics.findOrCreate = async function (
  email: string,
): Promise<INewsletter> {
  let subscriber = await this.findOne({ email });
  if (!subscriber) {
    subscriber = await this.create({ email });
  }
  return subscriber;
};

// Index the email field for faster lookups
newsletterSchema.index({ email: 1 });

// Export the model
const Newsletter: INewsletterModel = mongoose.model<INewsletter, INewsletterModel>(
  "Newsletter",
  newsletterSchema,
);

export default Newsletter;
