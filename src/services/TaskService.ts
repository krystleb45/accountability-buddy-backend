import type { ITask } from "../models/Task";
import Task from "../models/Task";
import NotificationService from "./NotificationService";
import LoggingService from "./LoggingService";

const TaskService = {
  /**
   * Create a new task for a user.
   *
   * @param {Partial<ITask>} taskData - The task data (title, description, etc.).
   * @param {string} userId - The ID of the user creating the task.
   * @returns {Promise<ITask>} - The newly created task.
   */
  createTask: async (
    taskData: Partial<ITask>,
    userId: string,
  ): Promise<ITask> => {
    try {
      const task = new Task({
        ...taskData,
        user: userId,
        status: "pending", // Default status for new tasks
      });

      const savedTask = await task.save();
      LoggingService.logInfo(
        `Task created for user: ${userId}, Task ID: ${savedTask._id}`,
      );

      // Notify the user about the task creation
      await NotificationService.sendInAppNotification(
        userId,
        `New task created: ${taskData.title}`,
      );

      return savedTask;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError("Error creating task", new Error(errorMessage), {
        taskData,
        userId,
      });
      throw new Error("Failed to create task");
    }
  },

  /**
   * Get tasks for a user with optional filters.
   *
   * @param {string} userId - The ID of the user whose tasks are fetched.
   * @param {Record<string, unknown>} filters - Optional filters (status, priority, etc.).
   * @returns {Promise<ITask[]>} - List of tasks.
   */
  getTasks: async (
    userId: string,
    filters: Record<string, unknown> = {},
  ): Promise<ITask[]> => {
    try {
      const tasks = await Task.find({ user: userId, ...filters });
      LoggingService.logInfo(`Fetched tasks for user: ${userId}`);
      return tasks;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError("Error fetching tasks", new Error(errorMessage), {
        userId,
        filters,
      });
      throw new Error("Failed to fetch tasks");
    }
  },

  /**
   * Update a task's details.
   *
   * @param {string} taskId - The ID of the task to update.
   * @param {Partial<ITask>} updates - The updates to apply to the task.
   * @returns {Promise<ITask | null>} - The updated task.
   */
  updateTask: async (
    taskId: string,
    updates: Partial<ITask>,
  ): Promise<ITask | null> => {
    try {
      const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });

      if (!task) {
        LoggingService.logWarn("Task not found", { taskId });
        throw new Error("Task not found");
      }

      LoggingService.logInfo(`Task updated: ${taskId}`);
      return task;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError("Error updating task", new Error(errorMessage), {
        taskId,
        updates,
      });
      throw new Error("Failed to update task");
    }
  },

  /**
   * Mark a task as complete.
   *
   * @param {string} taskId - The ID of the task to mark as complete.
   * @param {string} userId - The ID of the user completing the task.
   * @returns {Promise<ITask | null>} - The updated task.
   */
  completeTask: async (
    taskId: string,
    userId: string,
  ): Promise<ITask | null> => {
    try {
      const task = await Task.findByIdAndUpdate(
        taskId,
        { status: "completed", completedAt: new Date() },
        { new: true },
      );

      if (!task) {
        LoggingService.logWarn("Task not found for completion", { taskId });
        throw new Error("Task not found");
      }

      // Notify the user about the task completion
      await NotificationService.sendInAppNotification(
        userId,
        `Task completed: ${task.title}`,
      );
      LoggingService.logInfo(
        `Task completed by user: ${userId}, Task ID: ${taskId}`,
      );

      return task;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error marking task as complete",
        new Error(errorMessage),
        { taskId, userId },
      );
      throw new Error("Failed to complete task");
    }
  },

  /**
   * Delete a task.
   *
   * @param {string} taskId - The ID of the task to delete.
   * @param {string} userId - The ID of the user requesting the deletion.
   * @returns {Promise<{ success: boolean; message: string }>} - Result of the deletion operation.
   */
  deleteTask: async (
    taskId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const task = await Task.findByIdAndDelete(taskId);

      if (!task) {
        LoggingService.logWarn("Task not found for deletion", { taskId });
        throw new Error("Task not found");
      }

      // Notify the user about the task deletion
      await NotificationService.sendInAppNotification(
        userId,
        `Task deleted: ${task.title}`,
      );
      LoggingService.logInfo(
        `Task deleted by user: ${userId}, Task ID: ${taskId}`,
      );

      return { success: true, message: "Task deleted successfully" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError("Error deleting task", new Error(errorMessage), {
        taskId,
        userId,
      });
      throw new Error("Failed to delete task");
    }
  },

  /**
   * Track progress of a task.
   *
   * @param {string} taskId - The ID of the task to update progress.
   * @param {number} progress - The progress percentage to update (0-100).
   * @returns {Promise<ITask | null>} - The updated task.
   */
  trackProgress: async (
    taskId: string,
    progress: number,
  ): Promise<ITask | null> => {
    try {
      if (progress < 0 || progress > 100) {
        throw new Error("Progress must be between 0 and 100");
      }

      const task = await Task.findByIdAndUpdate(
        taskId,
        { progress },
        { new: true },
      );

      if (!task) {
        LoggingService.logWarn("Task not found for progress tracking", {
          taskId,
        });
        throw new Error("Task not found");
      }

      LoggingService.logInfo(
        `Task progress updated: ${taskId} to ${progress}%`,
      );
      return task;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error tracking task progress",
        new Error(errorMessage),
        { taskId, progress },
      );
      throw new Error("Failed to track task progress");
    }
  },
};

export default TaskService;
