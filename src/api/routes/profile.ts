import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import * as ProfileController from "../controllers/ProfileController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      await ProfileController.getProfile(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching profile for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/profile/update:
 *   put:
 *     summary: Update the current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  "/update",
  protect,
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

      await ProfileController.updateProfile(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error updating profile for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  }
);

export default router;
