import { parse, format } from "date-fns";
import logger from "../utils/winstonLogger";

export const DataProcessingService = {
  /**
   * Sanitize input data by trimming strings and removing unwanted characters.
   * @param data - The input object to sanitize.
   * @returns The sanitized object.
   */
  sanitizeInput(data: Record<string, unknown>): Record<string, unknown> {
    const sanitizedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        sanitizedData[key] = value.trim().replace(/[<>]/g, ""); // Trim and remove < >
      } else {
        sanitizedData[key] = value;
      }
    }

    logger.info("Input data sanitized successfully.");
    return sanitizedData;
  },

  /**
   * Paginate an array of data.
   * @param data - The array of data to paginate.
   * @param page - The current page number (1-based index).
   * @param limit - The number of items per page.
   * @returns The paginated data and metadata.
   */
  paginateArray<T>(
    data: T[],
    page: number,
    limit: number,
  ): { items: T[]; total: number; totalPages: number; currentPage: number } {
    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = data.slice(startIndex, startIndex + limit);

    logger.info(`Data paginated: Page ${page} of ${totalPages}`);
    return {
      items: paginatedItems,
      total,
      totalPages,
      currentPage: page,
    };
  },

  /**
   * Format a date into a specific string format.
   * @param date - The date to format (Date object or ISO string).
   * @param formatString - The desired format (default: 'yyyy-MM-dd').
   * @returns The formatted date string.
   */
  formatDate(date: Date | string, formatString = "yyyy-MM-dd"): string {
    try {
      const parsedDate =
        typeof date === "string" ? parse(date, "yyyy-MM-dd", new Date()) : date;
      const formattedDate = format(parsedDate, formatString);
      logger.info(`Date formatted successfully: ${formattedDate}`);
      return formattedDate;
    } catch (error) {
      logger.error("Error formatting date:", error);
      throw new Error("Invalid date format.");
    }
  },

  /**
   * Aggregate data based on a specific key.
   * @param data - The array of objects to aggregate.
   * @param key - The key to group by.
   * @returns An object where keys are unique values of the given key and values are grouped arrays.
   */
  aggregateByKey<T>(data: T[], key: keyof T): Record<string, T[]> {
    return data.reduce((acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  },

  /**
   * Calculate statistics for numeric fields in a dataset.
   * @param data - The array of objects to process.
   * @param numericKey - The key of the numeric field to calculate statistics for.
   * @returns Statistics including sum, average, min, and max.
   */
  calculateStatistics<T>(
    data: T[],
    numericKey: keyof T,
  ): { sum: number; average: number; min: number; max: number } {
    const values = data.map((item) => Number(item[numericKey])).filter((v) => !isNaN(v));
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length || 0;
    const min = Math.min(...values);
    const max = Math.max(...values);

    logger.info(`Statistics calculated for key "${String(numericKey)}".`);
    return { sum, average, min, max };
  },

  /**
   * Flatten a nested object into a single-level object with dot-separated keys.
   * @param obj - The nested object to flatten.
   * @param parentKey - The base key for nested properties (used for recursion).
   * @param separator - The separator to use for nested keys (default: '.').
   * @returns The flattened object.
   */
  flattenObject(
    obj: Record<string, unknown>,
    parentKey = "",
    separator = ".",
  ): Record<string, unknown> {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = parentKey ? `${parentKey}${separator}${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, this.flattenObject(obj[key] as Record<string, unknown>, newKey, separator));
      } else {
        acc[newKey] = obj[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
  },

  /**
   * Sort an array of objects by a specific key.
   * @param data - The array of objects to sort.
   * @param key - The key to sort by.
   * @param order - The order to sort ('asc' or 'desc').
   * @returns The sorted array.
   */
  sortByKey<T>(data: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
    return data.sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });
  },
};

export default DataProcessingService;
