// src/api/controllers/TaskController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import TaskService from "../services/TaskService";
import { ITask } from "../models/Task";

/**
 * @desc    Fetch all tasks for the authenticated user
 * @route   GET /api/tasks
 * @access  Private
 */
export const getAllTasks = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user!.id;
    const tasks: ITask[] = await TaskService.getTasks(userId);
    sendResponse(res, 200, true, "Tasks fetched successfully", { tasks });
  }
);

/**
 * @desc    Fetch a single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
export const getTaskById = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const results = await TaskService.getTasks(userId, { _id: req.params.id });
    if (!results.length) {
      sendResponse(res, 404, false, "Task not found");
      return;
    }
    sendResponse(res, 200, true, "Task fetched successfully", { task: results[0] });
  }
);

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
export const createTask = catchAsync(
  async (
    req: Request<{}, {}, Partial<ITask>>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const taskData = req.body;
    const newTask = await TaskService.createTask(taskData, userId);
    sendResponse(res, 201, true, "Task created successfully", { task: newTask });
  }
);

/**
 * @desc    Update a task by ID
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
export const updateTask = catchAsync(
  async (
    req: Request<{ id: string }, {}, Partial<ITask>>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const updated = await TaskService.updateTask(req.params.id, userId, req.body);
    sendResponse(res, 200, true, "Task updated successfully", { task: updated });
  }
);

/**
 * @desc    Delete a task by ID
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
export const deleteTask = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    await TaskService.deleteTask(req.params.id, userId);
    sendResponse(res, 200, true, "Task deleted successfully");
  }
);

/**
 * @desc    Mark a task as complete
 * @route   POST /api/tasks/:id/complete
 * @access  Private
 */
export const completeTask = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const completed = await TaskService.completeTask(req.params.id, userId);
    sendResponse(res, 200, true, "Task marked as complete", { task: completed });
  }
);

/**
 * @desc    Update a task's progress
 * @route   PATCH /api/tasks/:id/progress
 * @access  Private
 */
export const trackProgress = catchAsync(
  async (
    req: Request<{ id: string }, {}, { progress: number }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const { progress } = req.body;
    const updated = await TaskService.trackProgress(req.params.id, userId, progress);
    sendResponse(res, 200, true, "Task progress updated", { task: updated });
  }
);

export default {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  trackProgress,
};
