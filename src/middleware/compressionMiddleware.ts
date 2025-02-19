import compression from "compression";
import type { Request, Response, NextFunction } from "express";

/**
 * Middleware for request compression using gzip and Brotli.
 * Compresses responses based on content type and size threshold.
 */

// Explicitly define the middleware function type
const compressionMiddleware: (
  req: Request,
  res: Response,
  next: NextFunction
) => void = compression({
  // Filter responses to compress based on Content-Type
  filter: (req: Request, _res: Response): boolean => {
    const contentType = req.headers["content-type"] || "";

    // Compress text, JSON, CSS, JavaScript, and HTML content
    const compressibleTypes = [
      "text/",
      "application/json",
      "application/javascript",
      "text/css",
      "text/html",
    ];

    return compressibleTypes.some((type) =>
      contentType.toLowerCase().includes(type),
    );
  },

  // Compress responses larger than 1 KB
  threshold: 1024,

  // Use Brotli compression if supported, otherwise fallback to Gzip
  brotli: true, // Brotli support can be toggled here
  gzip: true,   // Ensure gzip is always enabled as a fallback
});

export default compressionMiddleware;
