// src/api/services/TaskService.ts
import type { ITask } from "../models/Task";
import Task from "../models/Task";
import NotificationService from "./NotificationService";
import LoggingService from "./LoggingService";

const TaskService = {
  /**
   * Create a new task for a user.
   */
  createTask: async (
    taskData: Partial<ITask>,
    userId: string,
  ): Promise<ITask> => {
    try {
      const task = new Task({
        ...taskData,
        user: userId,
        status: "pending",
      });
      const savedTask = await task.save();

      await LoggingService.logInfo(
        `Task created for user: ${userId}, Task ID: ${savedTask._id}`
      );

      void NotificationService.sendInAppNotification(
        userId, // sender
        userId, // receiver
        `New task created: ${savedTask.title}`
      );

      return savedTask.toObject();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await LoggingService.logError("Error creating task", new Error(msg), {
        taskData,
        userId,
      });
      throw new Error("Failed to create task");
    }
  },

  /**
   * Get tasks for a user with optional filters.
   */
  getTasks: async (
    userId: string,
    filters: Record<string, unknown> = {},
  ): Promise<ITask[]> => {
    try {
      const tasks = await Task
        .find({ user: userId, ...filters })
        .lean<ITask[]>()  // ← here
        .exec();

      await LoggingService.logInfo(`Fetched tasks for user: ${userId}`);
      return tasks;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await LoggingService.logError("Error fetching tasks", new Error(msg), {
        userId,
        filters,
      });
      throw new Error("Failed to fetch tasks");
    }
  },

  /**
   * Update a task's details.
   */
  updateTask: async (
    taskId: string,
    userId: string,
    updates: Partial<ITask>,
  ): Promise<ITask> => {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, user: userId },
        updates,
        { new: true, runValidators: true }
      )
        .lean<ITask>()
        .exec();

      if (!task) {
        await LoggingService.logWarn("Task not found", { taskId, userId });
        throw new Error("Task not found");
      }

      await LoggingService.logInfo(`Task updated: ${taskId}`);
      return task;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await LoggingService.logError("Error updating task", new Error(msg), {
        taskId,
        updates,
      });
      throw new Error("Failed to update task");
    }
  },

  /**
   * Mark a task as complete.
   */
  completeTask: async (
    taskId: string,
    userId: string,
  ): Promise<ITask> => {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, user: userId },
        { status: "completed", completedAt: new Date() },
        { new: true }
      )
        .lean<ITask>()
        .exec();

      if (!task) {
        await LoggingService.logWarn("Task not found for completion", { taskId, userId });
        throw new Error("Task not found");
      }

      void NotificationService.sendInAppNotification(
        userId,
        userId,
        `Task completed: ${task.title}`
      );
      await LoggingService.logInfo(
        `Task completed by user: ${userId}, Task ID: ${taskId}`
      );

      return task;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await LoggingService.logError(
        "Error marking task as complete",
        new Error(msg),
        { taskId, userId }
      );
      throw new Error("Failed to complete task");
    }
  },

  /**
   * Delete a task.
   */
  deleteTask: async (
    taskId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const task = await Task.findOneAndDelete({ _id: taskId, user: userId })
        .lean<ITask>()
        .exec();

      if (!task) {
        await LoggingService.logWarn("Task not found for deletion", { taskId, userId });
        throw new Error("Task not found");
      }

      void NotificationService.sendInAppNotification(
        userId,
        userId,
        `Task deleted: ${task.title}`
      );
      await LoggingService.logInfo(
        `Task deleted by user: ${userId}, Task ID: ${taskId}`
      );

      return { success: true, message: "Task deleted successfully" };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await LoggingService.logError("Error deleting task", new Error(msg), {
        taskId,
        userId,
      });
      throw new Error("Failed to delete task");
    }
  },

  /**
   * Track progress of a task.
   */
  trackProgress: async (
    taskId: string,
    userId: string,
    progress: number,
  ): Promise<ITask> => {
    try {
      if (progress < 0 || progress > 100) {
        throw new Error("Progress must be between 0 and 100");
      }

      const task = await Task.findOneAndUpdate(
        { _id: taskId, user: userId },
        { progress },
        { new: true }
      )
        .lean<ITask>()
        .exec();

      if (!task) {
        await LoggingService.logWarn("Task not found for progress tracking", {
          taskId,
        });
        throw new Error("Task not found");
      }

      await LoggingService.logInfo(
        `Task progress updated: ${taskId} to ${progress}%`
      );
      return task;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await LoggingService.logError(
        "Error tracking task progress",
        new Error(msg),
        { taskId, progress }
      );
      throw new Error("Failed to track task progress");
    }
  },
};

export default TaskService;
