import client from "prom-client";
import { collectDefaultMetrics } from "prom-client";
import express, { Request, Response } from "express";

// Register the Prometheus client
setInterval(() => {
  collectDefaultMetrics({
    prefix: "myapp_",  // Optionally, set a prefix
  });
}, 5000); // Collect metrics every 5 seconds

// Define custom metrics (example: HTTP request duration)
const httpRequestDurationMilliseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Histogram of HTTP request duration in seconds.",
  labelNames: ["method", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10], // Set the duration buckets
});

// Register custom metrics

// Function to expose metrics for Prometheus scraping
export const metricsMiddleware = (req: Request, res: Response, next: Function): void => {
  if (req.url === "/metrics") {
    // Expose metrics in a format Prometheus can scrape
    res.set("Content-Type", client.register.contentType);
    res.end(client.register.metrics());
  } else {
    next();
  }
};

// Middleware to track HTTP request duration
export const trackRequestDuration = (req: Request, res: Response, next: Function): void => {
  const end = httpRequestDurationMilliseconds.startTimer();
  
  res.on("finish", () => {
    end({
      method: req.method,
      status_code: res.statusCode.toString(),
    });
  });

  next();
};

// Initialize Prometheus metrics tracking
export const initializePrometheus = (app: express.Application): void => {
  // Use Prometheus middleware to expose the `/metrics` endpoint
  app.use(metricsMiddleware);

  // Track request duration
  app.use(trackRequestDuration);

  console.warn("Prometheus monitoring initialized");
};

