// src/controllers/faqController.ts
import { Request, Response, NextFunction } from "express";
import { Faq } from "../models/Faq";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

export const getAllFaqs = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const faqs = await Faq.find().lean().exec();
  sendResponse(res, 200, true, "FAQs retrieved successfully", faqs);
};

export const getFaqById = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const faq = await Faq.findById(req.params.id).lean().exec();
  if (!faq) throw createError("FAQ not found", 404);
  sendResponse(res, 200, true, "FAQ retrieved successfully", faq);
};

export const createFaq = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const faq = await Faq.create(req.body);
  sendResponse(res, 201, true, "FAQ created successfully", faq);
};

export const updateFaq = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .lean()
    .exec();
  if (!faq) throw createError("FAQ not found", 404);
  sendResponse(res, 200, true, "FAQ updated successfully", faq);
};

export const deleteFaq = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const faq = await Faq.findByIdAndDelete(req.params.id).lean().exec();
  if (!faq) throw createError("FAQ not found", 404);
  sendResponse(res, 200, true, "FAQ deleted successfully", null);
};
