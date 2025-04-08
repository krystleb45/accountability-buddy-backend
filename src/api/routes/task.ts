import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import sanitize from "mongo-sanitize";
import { protect } from "../middleware/authMiddleware";
import { logger } from "../../utils/winstonLogger";
import {
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
  getAllTasks,
} from "../controllers/TaskController";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management endpoints (CRUD)
 */

/**
 * Error handler
 */
const handleError = (
  error: unknown,
  res: Response,
  defaultMessage: string,
): void => {
  const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, msg: defaultMessage, error: errorMessage });
};

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/",
  protect,
  [
    check("title", "Task title is required").notEmpty(),
    check("dueDate", "Invalid due date").optional().isISO8601(),
  ],
  async (
    req: Request<{}, {}, { title: string; dueDate?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const sanitizedBody = sanitize(req.body);
      const newTask = await createTask(req.user?.id as string, sanitizedBody);
      res.status(201).json({ success: true, data: newTask });
    } catch (error) {
      handleError(error, res, "Error creating task");
      return next(error);
    }
  },
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user tasks
 */
router.get("/", protect, async (req, res, next) => {
  try {
    await getAllTasks(req, res, next);
  } catch (error) {
    handleError(error, res, "Error fetching tasks");
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a specific task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved
 *       404:
 *         description: Task not found
 */
router.get("/:id", protect, async (req, res, next) => {
  try {
    await getTaskById(req as Request<{ id: string }>, res, next);

  } catch (error) {
    handleError(error, res, "Error fetching task");
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  "/:id",
  protect,
  [
    check("title", "Task title is required").optional().notEmpty(),
    check("dueDate", "Invalid due date").optional().isISO8601(),
  ],
  async (
    req: Request<{ id: string }, {}, { title?: string; dueDate?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      await updateTask(req, res, next);
    } catch (error) {
      handleError(error, res, "Error updating task");
      next(error);
    }
  },
);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.delete("/:id", protect, async (req, res, next) => {
  try {
    await deleteTask(req as Request<{ id: string }>, res, next);

  } catch (error) {
    handleError(error, res, "Error deleting task");
    next(error);
  }
});

export default router;
