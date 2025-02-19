import logger from "./winstonLogger"; // Replace with your logger utility

/**
 * @desc Utility to retry asynchronous operations with configurable options.
 * @param asyncFn - The asynchronous function to retry.
 * @param options - Configuration options for the retry mechanism.
 * @returns Promise<T> - Returns the result of the successful asynchronous function or throws an error if all retries fail.
 * @throws Error - Throws an error if the operation fails after the maximum number of retries.
 */
const retryAsync = async <T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const {
    maxRetries = 3,
    delay = 1000,
    exponentialBackoff = true,
    shouldRetry = (): boolean => true, // Default is to retry for any error
  } = options;

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await asyncFn(); // Attempt the asynchronous operation
    } catch (error: unknown) {
      attempt += 1;

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.warn(`Retry attempt ${attempt} failed: ${errorMessage}`);

      // Check if we should retry based on custom logic
      if (!shouldRetry(error)) {
        logger.error(`Retry aborted after ${attempt} attempts.`);
        throw new Error(`Retry aborted due to error: ${errorMessage}`);
      }

      // If maximum retries reached, throw the error
      if (attempt >= maxRetries) {
        logger.error(`Failed after ${maxRetries} attempts: ${errorMessage}`);
        throw new Error(`Failed after ${maxRetries} attempts: ${errorMessage}`);
      }

      // Calculate delay for the next attempt (with exponential backoff if enabled)
      const retryDelay = exponentialBackoff ? delay * 2 ** (attempt - 1) : delay;

      // Wait before retrying
      await wait(retryDelay);
    }
  }

  throw new Error("Unexpected retry failure");
};

/**
 * @desc Helper function to delay execution for a given amount of time.
 * @param ms - Time to wait in milliseconds.
 * @returns Promise<void> - Resolves after the specified delay.
 */
const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * @desc Interface for retry options.
 */
interface RetryOptions {
  maxRetries?: number; // Maximum number of retries (default: 3)
  delay?: number; // Initial delay between retries in milliseconds (default: 1000ms)
  exponentialBackoff?: boolean; // Whether to use exponential backoff (default: true)
  shouldRetry?: (error: unknown) => boolean; // Custom function to determine if retry should occur
}

export default retryAsync;
