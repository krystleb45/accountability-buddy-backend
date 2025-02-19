import type { Request, Response, NextFunction } from "express";
import Task from "../models/Task"; // Assuming Task model exists

/**
 * @desc Fetch all tasks for a user
 * @route GET /api/tasks
 * @access Private
 */
export const getAllTasks = async (
  req: Request, 
  res: Response, 
  next: NextFunction,
): Promise<void> => {
  try {
    // Use userId to fetch tasks dynamically
    const userId = req.user?.id as string; // Fetch the authenticated user's ID

    // Fetch tasks from the database based on userId
    const tasks = await Task.find({ userId }); // Replace this with your actual DB logic

    // Send response with fetched tasks
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    // Log the error
    next(error); // Pass the error to middleware
  }
};


/**
 * @desc Fetch a single task by ID
 * @route GET /api/tasks/:id
 * @access Private
 */
export const getTaskById = async (
  req: Request<{ id: string }>, // Expect 'id' parameter
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id; // Extract user ID
    const { id } = req.params; // Extract task ID from params

    // Find the task by ID and user
    const task = await Task.findOne({ _id: id, userId });

    if (!task) {
      res.status(404).json({ success: false, msg: "Task not found" });
      return;
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    
    next(error); // Pass error to middleware
  }
};

/**
 * @desc Create a new task
 * @route POST /api/tasks
 * @access Private
 */
export const createTask = async (
  userId: string,
  taskData: { title: string; dueDate?: string },
): Promise<any> => {
  try {
    const newTask = {
      id: Date.now().toString(),
      userId,
      ...taskData,
      completed: false,
    };
    return newTask;
  } catch (error) {
    // Logs the error
    throw new Error(`Failed to create task: ${(error as Error).message}`); // Provides error details
  }
};


/**
 * @desc Update a task by ID
 * @route PUT /api/tasks/:id
 * @access Private
 */
export const updateTask = async (
  req: Request<{ id: string }, {}, { title?: string; dueDate?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find task by ID and user, and update it
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, userId: req.user?.id },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!updatedTask) {
      res.status(404).json({ success: false, msg: "Task not found" });
      return;
    }

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    
    next(error); // Pass error to middleware
  }
};

/**
 * @desc Delete a task by ID
 * @route DELETE /api/tasks/:id
 * @access Private
 */
export const deleteTask = async (
  req: Request<{ id: string }>, // Explicitly define ID param type
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find and delete the task by ID and user
    const deletedTask = await Task.findOneAndDelete({
      _id: id,
      userId: req.user?.id,
    });

    if (!deletedTask) {
      res.status(404).json({ success: false, msg: "Task not found" });
      return;
    }

    res.status(200).json({ success: true, msg: "Task deleted successfully" });
  } catch (error) {
    
    next(error); // Pass error to middleware
  }
};