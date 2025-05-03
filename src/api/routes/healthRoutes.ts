// src/api/routes/healthRoutes.ts
import { Router } from "express";
import * as healthController from "../controllers/HealthCheckController";

const router = Router();

// GET /api/health
router.get("/", healthController.healthCheck);

// GET /api/health/ready
router.get("/ready", healthController.readinessCheck);

export default router;
