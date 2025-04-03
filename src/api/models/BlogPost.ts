import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";

// Define the Comment interface
export interface IComment {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

// Define the BlogPost interface
export interface IBlogPost extends Document {
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  comments: IComment[];  // Using the IComment interface here
  createdAt: Date;
  updatedAt: Date;
}

// Define the BlogPost Schema
const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimize query performance
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        _id: { type: Schema.Types.ObjectId, auto: true },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true, // Automatically creates `createdAt` and `updatedAt`
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Virtual fields for quick UI calculations
BlogPostSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

BlogPostSchema.virtual("commentCount").get(function () {
  return this.comments.length;
});

// ✅ Indexing for faster retrieval
BlogPostSchema.index({ title: 1, category: 1, createdAt: -1 });
BlogPostSchema.index({ author: 1 }); // Optimized lookup for user blogs
BlogPostSchema.index({ createdAt: -1 }); // Speed up latest blogs queries

// ✅ Middleware to sanitize input before saving
BlogPostSchema.pre<IBlogPost>("save", function (next) {
  this.title = sanitize(this.title);
  this.content = sanitize(this.content);
  this.category = sanitize(this.category);
  next();
});

// Export the BlogPost model
const BlogPost: Model<IBlogPost> = mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);

export default BlogPost;
