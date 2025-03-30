import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";

// Define the Comment interface
interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt?: Date;
}

// Define the FeedPost interface
export interface IFeedPost extends Document {
  user: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  comments: IComment[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the Comment schema
const CommentSchema: Schema<IComment> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

// Define the FeedPost schema
const FeedPostSchema: Schema<IFeedPost> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: [1000, "Post content cannot exceed 1000 characters"],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [CommentSchema], // Nested comments schema
  },
  { timestamps: true },
);

// Pre-save hook to sanitize content
FeedPostSchema.pre<IFeedPost>("save", function (next) {
  try {
    this.content = sanitize(this.content);
    this.comments.forEach((comment) => {
      comment.text = sanitize(comment.text);
    });
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Export the model
const FeedPost: Model<IFeedPost> = mongoose.model<IFeedPost>(
  "FeedPost",
  FeedPostSchema,
);
export default FeedPost;
