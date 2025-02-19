import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import authMiddleware from "../middleware/authMiddleware"; // Corrected middleware import path
import * as ProfileController from "../controllers/ProfileController"; // Corrected controller import path
import logger from "../utils/winstonLogger"; // Import logger utility
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();



/**
 * @route   GET /profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      // Pass the correct arguments to the controller function
      await ProfileController.getProfile(req, res, next);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching profile for user ${req.user?.id}: ${errorMessage}`);
      next(error); // Pass error to global error handler
    }
  },
);


/**
 * @route   PUT /profile/update
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/update",
  authMiddleware,
  [
    check("name").optional().isString().withMessage("Name must be a string."),
    check("email").optional().isEmail().withMessage("Email must be valid."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      // Call the controller with the correct arguments
      await ProfileController.updateProfile(req, res, next);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error updating profile for user ${req.user?.id}: ${errorMessage}`);
      next(error); // Pass error to global error handler
    }
  },
);

export default router;
