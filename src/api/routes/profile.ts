// src/api/routes/profile.ts
import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import { getProfile, updateProfile } from "../controllers/ProfileController";

const router = Router();

/**
 * @route   GET /api/profile
 * @desc    Get the current user's profile
 * @access  Private
 */
router.get("/", protect, getProfile);

/**
 * @route   PUT /api/profile/update
 * @desc    Update the current user's profile
 * @access  Private
 */
router.put(
  "/update",
  protect,
  [
    check("username")
      .optional()
      .isString()
      .withMessage("Username must be a string."),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Email must be a valid email address."),
    handleValidationErrors,
  ],
  updateProfile
);

export default router;
