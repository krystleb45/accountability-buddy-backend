import type { Response } from "express";

/**
 * @desc    Standardizes API responses for consistent structure across endpoints.
 * @param   res - Express response object.
 * @param   statusCode - HTTP status code.
 * @param   success - Boolean indicating success or failure of the operation.
 * @param   message - A human-readable message explaining the outcome.
 * @param   data - Optional response data.
 * @param   errors - Optional error details (can be an array or an object).
 * @param   meta - Optional metadata for additional response info (e.g., pagination).
 */
const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message = "No message provided",
  data: T | null = null,
  errors: Record<string, unknown>[] | Record<string, unknown> | null = null,
  meta: Record<string, unknown> | null = null,
): Response => {
  const response: Record<string, unknown> = {
    success, // Directly accept success as a parameter
    message,
    timestamp: new Date().toISOString(), // Add timestamp for tracking
  };

  // Include response data if present
  if (data) {
    response.data = data;
  }

  // Include errors if present (can be an array or object)
  if (errors) {
    response.errors = Array.isArray(errors) ? errors : [errors];
  }

  // Include metadata if present (e.g., pagination info)
  if (meta) {
    response.meta = meta;
  }

  // Send the JSON response
  return res.status(statusCode).json(response);
};

export default sendResponse;
