import type { Router, Request, Response } from "express";
import express from "express";
import type { IRole } from "../models/Role";
import Role from "../models/Role"; // Corrected model import path
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl"; // Corrected middleware import path
import authMiddleware from "../middleware/authMiddleware"; // Corrected middleware import path
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger"; // Logger utility

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of the roles route.
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per IP
  message: "Too many requests. Please try again later.",
});

/**
 * @route   POST /roles/seed
 * @desc    Seed predefined roles into the database
 * @access  Private (Admin only)
 */
router.post(
  "/seed",
  authMiddleware,
  roleBasedAccessControl(["admin"]),
  rateLimiter,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const roles = [
        { roleName: "admin", permissions: ["manage_users", "view_reports"] },
        { roleName: "user", permissions: ["view_content"] },
      ];

      const seededRoles: IRole[] = []; // Explicitly type the array as IRole[]

      for (const role of roles) {
        const existingRole = await Role.findOne({ roleName: role.roleName });
        if (!existingRole) {
          // Explicit casting applied here
          const createdRole = (await Role.create(role)) as IRole; // Cast to IRole
          seededRoles.push(createdRole); // Push the created role
        }
      }

      res.status(201).json({
        success: true,
        message: "Roles seeded successfully.",
        data: seededRoles,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Role seeding error: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: "Error seeding roles.",
        error: errorMessage,
      });
    }
  },
);


export default router;
