import type { Response } from "express";

interface ErrorDetail {
  field: string;
  message: string;
}

interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ErrorDetail[];
}

/**
 * Standardized response for success.
 */
export const successResponse = <T>(
  res: Response,
  message = "Operation successful",
  data: T = {} as T,
  statusCode = 200,
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standardized response for failure.
 */
export const errorResponse = (
  res: Response,
  message = "Operation failed",
  statusCode = 400,
  errors: ErrorDetail[] = [],
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: formatErrors(errors),
  });
};

/**
 * Standardized response for validation errors.
 */
export const validationErrorResponse = (
  res: Response,
  errors: ErrorDetail[] = [],
  message = "Validation failed",
  statusCode = 422,
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: formatErrors(errors),
  });
};

/**
 * Response for unauthorized access.
 */
export const unauthorizedResponse = (
  res: Response,
  message = "Unauthorized access",
): Response<ApiResponse<null>> => {
  return res.status(401).json({
    success: false,
    message,
  });
};

/**
 * Response for forbidden access.
 */
export const forbiddenResponse = (
  res: Response,
  message = "Access forbidden",
): Response<ApiResponse<null>> => {
  return res.status(403).json({
    success: false,
    message,
  });
};

/**
 * Response for not found.
 */
export const notFoundResponse = (
  res: Response,
  message = "Resource not found",
): Response<ApiResponse<null>> => {
  return res.status(404).json({
    success: false,
    message,
  });
};

/**
 * Internal server error response.
 */
export const serverErrorResponse = (
  res: Response,
  message = "Internal server error",
  statusCode = 500,
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * Helper function to format errors.
 */
const formatErrors = (errors: ErrorDetail[]): ErrorDetail[] => {
  return errors.map((error) => ({
    field: error.field || "general",
    message: error.message || "An error occurred",
  }));
};
