import type { AxiosResponse } from "axios";
import axios, { AxiosError } from "axios";
import LoggingService from "./LoggingService";

class ThirdPartyAPIService {
  /**
   * Makes a GET request to a third-party API.
   * @param {string} url - The API endpoint to call.
   * @param {Record<string, string>} headers - Optional headers to include in the request.
   * @param {number} retries - Number of retries before failing.
   * @param {number} timeout - Request timeout in milliseconds (default: 5000ms).
   * @returns {Promise<unknown>} - Response data from the API.
   */
  static async get(
    url: string,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.get(url, { headers, timeout });
      LoggingService.logInfo(`GET request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("get", error, url, headers, null, retries, timeout);
    }
  }

  /**
   * Makes a POST request to a third-party API.
   * @param {string} url - The API endpoint to call.
   * @param {Record<string, unknown>} data - The payload to send with the POST request.
   * @param {Record<string, string>} headers - Optional headers to include in the request.
   * @param {number} retries - Number of retries before failing.
   * @param {number} timeout - Request timeout in milliseconds (default: 5000ms).
   * @returns {Promise<unknown>} - Response data from the API.
   */
  static async post(
    url: string,
    data: Record<string, unknown>,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.post(url, data, { headers, timeout });
      LoggingService.logInfo(`POST request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("post", error, url, headers, data, retries, timeout);
    }
  }

  /**
   * Makes a PUT request to a third-party API.
   * @param {string} url - The API endpoint to call.
   * @param {Record<string, unknown>} data - The payload to send with the PUT request.
   * @param {Record<string, string>} headers - Optional headers to include in the request.
   * @param {number} retries - Number of retries before failing.
   * @param {number} timeout - Request timeout in milliseconds (default: 5000ms).
   * @returns {Promise<unknown>} - Response data from the API.
   */
  static async put(
    url: string,
    data: Record<string, unknown>,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.put(url, data, { headers, timeout });
      LoggingService.logInfo(`PUT request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("put", error, url, headers, data, retries, timeout);
    }
  }

  /**
   * Makes a DELETE request to a third-party API.
   * @param {string} url - The API endpoint to call.
   * @param {Record<string, string>} headers - Optional headers to include in the request.
   * @param {number} retries - Number of retries before failing.
   * @param {number} timeout - Request timeout in milliseconds (default: 5000ms).
   * @returns {Promise<unknown>} - Response data from the API.
   */
  static async delete(
    url: string,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.delete(url, { headers, timeout });
      LoggingService.logInfo(`DELETE request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("delete", error, url, headers, null, retries, timeout);
    }
  }

  /**
   * Handles request errors with retry logic and exponential backoff.
   * @param {"get" | "post" | "put" | "delete"} method - The HTTP method (GET, POST, etc.).
   * @param {unknown} error - The error object.
   * @param {string} url - The API endpoint URL.
   * @param {Record<string, string>} headers - Request headers.
   * @param {Record<string, unknown> | null} data - Request data for POST/PUT.
   * @param {number} retries - Number of retries left.
   * @param {number} timeout - Timeout for the request.
   * @returns {Promise<unknown>} - Retry response or throws the final error.
   */
  private static async handleRequestError(
    method: "get" | "post" | "put" | "delete",
    error: unknown,
    url: string,
    headers: Record<string, string>,
    data: Record<string, unknown> | null,
    retries: number,
    timeout: number,
  ): Promise<unknown> {
    const errorMessage =
      error instanceof AxiosError
        ? `${error.response?.status ?? "Unknown"} - ${error.response?.statusText ?? "No status text"}`
        : error instanceof Error
          ? error.message
          : "Unknown error";

    if (retries > 0) {
      const backoffTime = 2000 * (4 - retries); // Exponential backoff
      LoggingService.logError(
        `${method.toUpperCase()} request failed to ${url}, retrying in ${backoffTime / 1000}s: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage),
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));

      // Dynamically call the method based on its type
      if (method === "get" || method === "delete") {
        return this[method](url, headers, retries - 1, timeout);
      } else if (method === "post" || method === "put") {
        return this[method](url, data || {}, headers, retries - 1, timeout);
      }
    }

    LoggingService.logError(
      `${method.toUpperCase()} request failed after retries to ${url}: ${errorMessage}`,
      error instanceof Error ? error : new Error(errorMessage),
    );
    throw new Error(
      `Failed to ${method.toUpperCase()} data from third-party API after multiple attempts.`,
    );
  }
}

export default ThirdPartyAPIService;
