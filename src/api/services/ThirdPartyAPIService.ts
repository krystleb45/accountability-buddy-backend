// src/api/services/ThirdPartyAPIService.ts
import type { AxiosResponse } from "axios";
import axios, { AxiosError } from "axios";
import LoggingService from "./LoggingService";

class ThirdPartyAPIService {
  static async get(
    url: string,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.get(url, { headers, timeout });
      void LoggingService.logInfo(`GET request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("get", error, url, headers, null, retries, timeout);
    }
  }

  static async post(
    url: string,
    data: Record<string, unknown>,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.post(url, data, { headers, timeout });
      void LoggingService.logInfo(`POST request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("post", error, url, headers, data, retries, timeout);
    }
  }

  static async put(
    url: string,
    data: Record<string, unknown>,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.put(url, data, { headers, timeout });
      void LoggingService.logInfo(`PUT request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("put", error, url, headers, data, retries, timeout);
    }
  }

  static async delete(
    url: string,
    headers: Record<string, string> = {},
    retries = 3,
    timeout = 5000,
  ): Promise<unknown> {
    try {
      const response: AxiosResponse = await axios.delete(url, { headers, timeout });
      void LoggingService.logInfo(`DELETE request successful to ${url}`);
      return response.data;
    } catch (error: unknown) {
      return this.handleRequestError("delete", error, url, headers, null, retries, timeout);
    }
  }

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
      void LoggingService.logError(
        `${method.toUpperCase()} request failed to ${url}, retrying in ${backoffTime / 1000}s: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage),
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));

      // Dynamically call the method based on its type
      if (method === "get" || method === "delete") {
        return this[method](url, headers, retries - 1, timeout);
      } else {
        return this[method](url, data || {}, headers, retries - 1, timeout);
      }
    }

    void LoggingService.logError(
      `${method.toUpperCase()} request failed after retries to ${url}: ${errorMessage}`,
      error instanceof Error ? error : new Error(errorMessage),
    );
    throw new Error(
      `Failed to ${method.toUpperCase()} data from third-party API after multiple attempts.`,
    );
  }
}

export default ThirdPartyAPIService;
