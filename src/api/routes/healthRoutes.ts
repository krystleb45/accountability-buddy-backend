import { Router } from "express";
import * as healthController from "../controllers/HealthCheckController";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check server + DB status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server & DB are healthy
 *       500:
 *         description: DB is disconnected
 */
router.get("/health", healthController.healthCheck);

/**
 * @swagger
 * /api/ready:
 *   get:
 *     summary: Readiness probe (app started)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is ready
 */
router.get("/ready", healthController.readinessCheck);

export default router;
