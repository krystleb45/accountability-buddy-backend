import type { Router, Request, Response } from "express";
import express from "express";
import type { IRole } from "../models/Role";
import Role from "../models/Role";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of the roles route.
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Manage user roles and permissions
 */

/**
 * @swagger
 * /api/roles/seed:
 *   post:
 *     summary: Seed predefined roles into the database
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Roles seeded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roleName:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can access
 *       500:
 *         description: Server error while seeding roles
 */
router.post(
  "/seed",
  protect,
  roleBasedAccessControl(["admin"]),
  rateLimiter,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const roles = [
        { roleName: "admin", permissions: ["manage_users", "view_reports"] },
        { roleName: "user", permissions: ["view_content"] },
      ];

      const seededRoles: IRole[] = [];

      for (const role of roles) {
        const existingRole = await Role.findOne({ roleName: role.roleName });
        if (!existingRole) {
          const createdRole = (await Role.create(role)) as IRole;
          seededRoles.push(createdRole);
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
  }
);

export default router;
