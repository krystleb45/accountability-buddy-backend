// src/utils/errorUtils.ts
import { CustomError } from "../middleware/errorMiddleware";  // Import CustomError from your errorMiddleware

const createError = (
  message: string,
  statusCode: number = 500,
  details?: any
): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.details = details; // Optional: add additional details to the error
  return error;
};

export default createError;
