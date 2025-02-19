import type { Request, Response, NextFunction } from "express-serve-static-core";

interface CacheControlOptions {
  maxAge?: number;       // Maximum time (in seconds) the response should be cached
  sMaxAge?: number;      // Maximum time (in seconds) for shared caches
  noCache?: boolean;     // Forces revalidation with the server
  noStore?: boolean;     // Prevents storing the response
  private?: boolean;     // Cacheable only by the user's browser
  public?: boolean;      // Cacheable by both private and shared caches
}

/**
 * Cache Control Middleware
 * Sets cache control headers for responses based on customizable options.
 * Helps manage client-side caching behavior and optimize performance.
 *
 * @param options - Configuration options for cache control.
 * @returns Middleware function to set Cache-Control headers.
 */
const cacheControl = (options: CacheControlOptions = {}) => {
  const {
    maxAge = 0,          // Default max age (in seconds)
    sMaxAge = null,      // Default to null for shared max age
    noCache = false,
    noStore = false,
    private: isPrivate = false,
    public: isPublic = false,
  } = options;

  return (_req: Request, res: Response, next: NextFunction): void => {
    const cacheHeader: string[] = [];

    // Apply "no-store" directive if specified
    if (noStore) {
      cacheHeader.push("no-store");
    } else {
      // Apply other cache directives based on options
      if (noCache) cacheHeader.push("no-cache");
      if (isPrivate) cacheHeader.push("private");
      if (isPublic) cacheHeader.push("public");
      if (maxAge) cacheHeader.push(`max-age=${maxAge}`);
      if (sMaxAge) cacheHeader.push(`s-maxage=${sMaxAge}`);
    }

    // Set the 'Cache-Control' header if directives are defined
    if (cacheHeader.length > 0) {
      res.setHeader("Cache-Control", cacheHeader.join(", "));
    }

    next();
  };
};

export default cacheControl;
