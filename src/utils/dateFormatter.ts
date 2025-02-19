interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  details: string[];
  timestamp: string;
}

interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  pagination: PaginationMetadata;
  timestamp: string;
}

/**
 * @desc Formats response data consistently before sending it to the client.
 * @param {T} data - The actual data to send in the response.
 * @param {string} [message='Request successful'] - A success message to include.
 * @returns {SuccessResponse<T>} - The formatted success response object.
 */
export const formatSuccessResponse = <T>(
  data: T,
  message = "Request successful",
): SuccessResponse<T> => {
  return {
    success: true,
    message,
    data: data || ({} as T),
    timestamp: new Date().toISOString(),
  };
};

/**
 * @desc Formats error responses consistently before sending them to the client.
 * @param {string} errorMessage - A message explaining the error.
 * @param {number} [statusCode=400] - The HTTP status code.
 * @param {string[]} [details=[]] - Optional array of error details.
 * @returns {ErrorResponse} - The formatted error response object.
 */
export const formatErrorResponse = (
  errorMessage: string,
  statusCode = 400,
  details: string[] = [],
): ErrorResponse => {
  return {
    success: false,
    message: errorMessage || "An error occurred",
    statusCode,
    details: Array.isArray(details) ? details : [details],
    timestamp: new Date().toISOString(),
  };
};

/**
 * @desc Formats a paginated response with metadata for large datasets.
 * @param {T[]} data - The actual data to send in the response.
 * @param {number} page - Current page number.
 * @param {number} pageSize - Number of items per page.
 * @param {number} totalItems - Total number of items in the dataset.
 * @param {string} [message='Request successful'] - A success message to include.
 * @returns {PaginatedResponse<T>} - The formatted paginated response object.
 */
export const formatPaginatedResponse = <T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number,
  message = "Request successful",
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return {
    success: true,
    message,
    data: data || [],
    pagination: {
      currentPage: page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
};
