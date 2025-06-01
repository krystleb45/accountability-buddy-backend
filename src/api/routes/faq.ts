// src/api/routes/faq.ts
import { Router } from "express";
import catchAsync from "../utils/catchAsync";
import { protect } from "../middleware/authJwt";
import * as faqController from "../controllers/faqController";

const router = Router();

router.get("/", catchAsync(faqController.getAllFaqs));
router.get("/:id", catchAsync(faqController.getFaqById));
router.post("/", protect, catchAsync(faqController.createFaq));
router.put("/:id", protect, catchAsync(faqController.updateFaq));
router.delete("/:id", protect, catchAsync(faqController.deleteFaq));

export default router;
