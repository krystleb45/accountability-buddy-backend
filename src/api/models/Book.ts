import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Comment interface for books
interface IBookComment {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

// Define the Book interface
export interface IBook extends Document {
  title: string;
  author: string;
  category: string;
  description: string;
  coverImage?: string;
  addedBy: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  comments: IBookComment[];
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  addLike(userId: mongoose.Types.ObjectId): Promise<void>;
  removeLike(userId: mongoose.Types.ObjectId): Promise<void>;
  addComment(userId: mongoose.Types.ObjectId, text: string): Promise<void>;
  removeComment(commentId: mongoose.Types.ObjectId): Promise<void>;
}

// Define the Book Schema
const BookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      maxlength: [150, "Author name cannot exceed 150 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    coverImage: {
      type: String,
      trim: true,
      validate: {
        validator: function (url: string): boolean {
          return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg))$/.test(url);
        },
        message: "Invalid cover image URL format",
      },
    },
    addedBy: {
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
  }
);

// ✅ Indexing for optimized searches
BookSchema.index({ title: 1, category: 1, createdAt: -1 });
BookSchema.index({ author: 1 }); // Optimized lookup for books by author
BookSchema.index({ addedBy: 1 }); // Optimized lookup for user recommendations

// ✅ Ensure Unique Likes (Pre-Save Hook)
BookSchema.pre<IBook>("save", function (next): void {
  this.likes = Array.from(new Set(this.likes.map((id) => id.toString()))).map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  next();
});

// ✅ Instance Method: Add Like
BookSchema.methods.addLike = async function (
  userId: mongoose.Types.ObjectId
): Promise<void> {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    await this.save();
  }
};

// ✅ Instance Method: Remove Like
BookSchema.methods.removeLike = async function (
  userId: mongoose.Types.ObjectId
): Promise<void> {
  this.likes = this.likes.filter((id: { equals: (arg0: mongoose.Types.ObjectId) => any; }) => !id.equals(userId));
  await this.save();
};

// ✅ Instance Method: Add Comment
BookSchema.methods.addComment = async function (
  userId: mongoose.Types.ObjectId,
  text: string
): Promise<void> {
  this.comments.push({
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    text,
    createdAt: new Date(),
  });
  await this.save();
};

// ✅ Instance Method: Remove Comment
BookSchema.methods.removeComment = async function (
  commentId: mongoose.Types.ObjectId
): Promise<void> {
  this.comments = this.comments.filter(
    (comment: { _id: { equals: (arg0: mongoose.Types.ObjectId) => any; }; }) => !comment._id.equals(commentId)
  );
  await this.save();
};

// Export the Book model
const Book: Model<IBook> = mongoose.model<IBook>("Book", BookSchema);

export default Book;
