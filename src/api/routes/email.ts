import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as emailController from "../controllers/emailController";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many email requests, please try again later." }
});

router.post(
  "/send",
  protect,
  limiter,
  // directly hand off to the catchAsync-wrapped controller
  emailController.sendEmail
);

export default router;
