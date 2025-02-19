/**
 * @desc Parses and sanitizes query parameters with support for:
 *       - Default values
 *       - Type conversion (e.g., string to number, boolean, or date)
 *       - Input sanitization
 * @param query - The query object from `req.query`.
 * @param schema - An object defining expected query parameters, their types, and default values.
 *
 * Example schema:
 * {
 *   page: { type: 'number', default?: 1 },
 *   limit: { type: 'number', default?: 10 },
 *   sortBy: { type: 'string', default?: 'createdAt' },
 *   ascending: { type: 'boolean', default?: false },
 *   startDate: { type: 'date', default?: null }
 * }
 *
 * @returns Parsed and sanitized query parameters.
 */
type QueryType = "number" | "boolean" | "date" | "string";

interface QuerySchema {
  type: QueryType;
  default?: number | boolean | Date | string | null;
}

type ParsedQuery = Record<string, string | number | boolean | Date | null>;

const parseQuery = (
  query: Record<string, unknown>,
  schema: Record<string, QuerySchema>,
): ParsedQuery => {
  const parsedQuery: ParsedQuery = {};

  for (const key in schema) {
    const { type, default: defaultValue } = schema[key];
    let value = query[key] !== undefined ? query[key] : defaultValue;

    // Handle type conversion and sanitization
    switch (type) {
      case "number":
        value = value !== undefined ? Number(value) : defaultValue;
        if (isNaN(value as number)) value = defaultValue ?? null;
        break;

      case "boolean":
        value = value === "true" || value === true;
        break;

      case "date":
        value =
          value !== undefined && new Date(value as string).toString() !== "Invalid Date"
            ? new Date(value as string)
            : defaultValue ?? null;
        break;

      case "string":
        value = value !== undefined ? sanitizeString(value as string) : defaultValue ?? null;
        break;

      default:
        value = defaultValue ?? null;
        break;
    }

    parsedQuery[key] = value as string | number | boolean | Date | null;
  }

  return parsedQuery;
};

/**
 * @desc Sanitizes a string input by trimming and escaping potentially unsafe characters.
 * @param str - The string to sanitize.
 * @returns Sanitized string.
 */
const sanitizeString = (str: unknown): string => {
  if (typeof str !== "string") return "";
  return str.trim().replace(/[<>{}]/g, ""); // Remove potentially unsafe characters
};

export default parseQuery;
