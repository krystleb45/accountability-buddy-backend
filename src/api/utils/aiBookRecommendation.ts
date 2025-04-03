import mongoose, { Model, Schema } from "mongoose";

// Import IBook interface from the correct model file
import { IBook } from "../models/Book"; // Import the IBook interface to ensure type safety

// Define the Book Schema
const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    author: { type: String, required: true },
    description: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Add like method
BookSchema.methods.addLike = async function (userId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    await this.save();
  }
};

// Remove like method
BookSchema.methods.removeLike = async function (userId: mongoose.Types.ObjectId): Promise<void> {
  this.likes = this.likes.filter((like: { equals: (arg0: mongoose.Types.ObjectId) => any; }) => !like.equals(userId));
  await this.save();
};

// Add comment method
BookSchema.methods.addComment = async function (
  userId: mongoose.Types.ObjectId,
  text: string
): Promise<void> {
  this.comments.push({
    user: userId,
    text,
    createdAt: new Date(),
  });
  await this.save();
};

// Create the model
const Book: Model<IBook> = mongoose.model<IBook>("Book", BookSchema);

// Example for creating a new book
const createNewBook = async (): Promise<void> => {
  const newBook = new Book({
    title: "Test Book",
    category: "Programming",
    author: "John Doe",
    description: "A test book on programming.",
    addedBy: new mongoose.Types.ObjectId(), // Ideally, this should be an actual user ID
    likes: [],
    comments: [],
  });

  // Await the Promise from the save method
  const savedBook = await newBook.save();

  // Log the result
  console.warn("New Book Created:", savedBook);
};

// Call createNewBook and await its result
createNewBook().catch((error) => {
  console.error("Error creating book:", error);
});
