import helmet from "helmet"; // Use ES module import for TypeScript compliance

// Configure Helmet middleware with enhanced options
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true, // Start with Helmet's default CSP settings
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Consider replacing with CSP nonces/hashes
        "'unsafe-eval'", // Use cautiously, only if necessary
        "cdnjs.cloudflare.com", // Example for allowing third-party scripts
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Replace with CSP nonces/hashes for better security
        "fonts.googleapis.com", // Example for Google Fonts
      ],
      imgSrc: ["'self'", "data:", "blob:"], // Allow inline images and blobs
      connectSrc: [
        "'self'",
        "api.example.com", // Define trusted API endpoints
      ],
      fontSrc: ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
      objectSrc: ["'none'"], // Prevent embedding of objects (e.g., Flash)
      upgradeInsecureRequests: [], // Automatically upgrade HTTP to HTTPS
      blockAllMixedContent: [], // Prevent mixed content
    },
    reportOnly: process.env.CSP_REPORT_ONLY === "true", // Enable CSP report-only mode for testing
  },
  dnsPrefetchControl: { allow: false }, // Disallow DNS prefetching
  frameguard: { action: "deny" }, // Prevent clickjacking by blocking iframes
  hidePoweredBy: true, // Hide the 'X-Powered-By' header
  hsts: {
    maxAge: 31536000, // Enforce HTTPS for one year
    includeSubDomains: true, // Include subdomains in HSTS
    preload: true, // Enable HSTS preload
  },
  ieNoOpen: true, // Prevent IE from executing downloads in site's context
  noSniff: true, // Prevent MIME-type sniffing
  referrerPolicy: { policy: "no-referrer" }, // Restrict referrer information
});

export default helmetMiddleware; // Use ES module export for TypeScript compliance
