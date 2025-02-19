import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import authMiddleware from "../middleware/authMiddleware";
import sanitize from "mongo-sanitize";
import logger from "../utils/winstonLogger";
import {
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
  getAllTasks,
} from "../controllers/TaskController";


const router: Router = express.Router();

/**
 * Error handler for unexpected errors.
 */
const handleError = (
  error: unknown,
  res: Response,
  defaultMessage: string,
): void => {
  const errorMessage =
    error instanceof Error ? error.message : "Unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, msg: defaultMessage, error: errorMessage });
};

/**
 * @route   POST /tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  "/",
  authMiddleware,
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
      const newTask = await createTask(req.user?.id as string, sanitizedBody); // Fixed call
      res.status(201).json({ success: true, data: newTask });
    } catch (error) {
      handleError(error, res, "Error creating task");
      return next(error);
    }
  },
);


/**
 * @route   GET /tasks
 * @desc    Get all tasks for the user
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await getAllTasks(req, res, next); // Pass all required arguments
    } catch (error) {
      handleError(error, res, "Error fetching tasks");
    }
  },
);


/**
 * @route   GET /tasks/:id
 * @desc    Get a task by ID
 * @access  Private
 */
router.get(
  "/:id",
  authMiddleware,
  async (
    req: Request<{ id: string }>, // Explicitly define ID param type
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await getTaskById(req, res, next); // Pass all required arguments
    } catch (error) {
      handleError(error, res, "Error fetching task");
      next(error);
    }
  },
);


/**
 * @route   PUT /tasks/:id
 * @desc    Update a task by ID
 * @access  Private
 */
router.put(
  "/:id",
  authMiddleware,
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
      // Pass the request, response, and next function directly
      await updateTask(req, res, next);
    } catch (error) {
      handleError(error, res, "Error updating task");
      next(error); // Pass error to middleware
    }
  },
);

/**
 * @route   DELETE /tasks/:id
 * @desc    Delete a task by ID
 * @access  Private
 */
router.delete(
  "/:id",
  authMiddleware,
  async (
    req: Request<{ id: string }>, // Explicitly define ID param type
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Pass req, res, and next to the controller
      await deleteTask(req, res, next);
    } catch (error) {
      handleError(error, res, "Error deleting task");
      next(error); // Pass error to middleware
    }
  },
);


export default router;
