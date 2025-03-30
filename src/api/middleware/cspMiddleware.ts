import helmet from "helmet";

/**
 * Middleware to configure Content Security Policy (CSP) headers.
 */
const cspMiddleware = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      process.env.NODE_ENV === "development" ? "'unsafe-inline'" : "'nonce-random'",
    ],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
});

export default cspMiddleware;
