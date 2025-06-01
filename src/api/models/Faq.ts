import mongoose, { Document, Schema } from "mongoose";

export interface IFaq extends Document {
  question: string;
  answer: string;
  createdAt: Date;
  updatedAt: Date;
}

const FaqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer:   { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Faq = mongoose.model<IFaq>("Faq", FaqSchema);
