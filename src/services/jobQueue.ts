import Queue from "bull";
import { sendEmail } from "./emailProcessor";
import logger from "../utils/winstonLogger";

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
  ...(process.env.NODE_ENV === "production" ? { tls: {} } : {}), // Use TLS in production
};

// Create a Bull queue for email jobs with enhanced configuration
const emailQueue = new Queue("emailQueue", {
  redis: redisConfig,
  limiter: {
    max: 1000, // Limit the number of jobs processed within a time frame
    duration: 60000, // 1000 jobs per minute
  },
  defaultJobOptions: {
    attempts: 5, // Retry failed jobs up to 5 times
    backoff: {
      type: "exponential", // Use exponential backoff for retries
      delay: 2000, // Initial delay of 2 seconds between retries
    },
    removeOnComplete: true, // Automatically remove completed jobs
    removeOnFail: false, // Keep failed jobs for review
  },
});

// Process email jobs from the queue
void emailQueue.process(async (job): Promise<void> => {
  const { to, subject, text } = job.data;
  try {
    logger.info(`Processing email job: ${job.id} to ${to}`);
    await sendEmail(to, subject, text); // Send email using email processor
    logger.info(`Email job completed: ${job.id} to ${to}`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing email job ${job.id}: ${errorMessage}`);
    throw new Error("Email processing failed"); // Job will be retried automatically
  }
});

// Add a job to the queue
const addEmailToQueue = async (
  to: string,
  subject: string,
  text: string,
  priority = 3,
): Promise<void> => {
  try {
    await emailQueue.add(
      { to, subject, text },
      {
        priority, // Set job priority (lower numbers have higher priority)
        lifo: false, // Jobs are processed in FIFO order (First In, First Out)
      },
    );
    logger.info(`Email job added to queue for ${to} with priority ${priority}`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error adding email job to queue: ${errorMessage}`);
  }
};

// Event handling for queue errors and status
emailQueue.on("failed", (job, err): void => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
});

emailQueue.on("completed", (job): void => {
  logger.info(`Job ${job.id} completed successfully`);
});

emailQueue.on("stalled", (job): void => {
  logger.warn(`Job ${job.id} stalled and will be retried`);
});

emailQueue.on("error", (error): void => {
  logger.error(`Queue error: ${error.message}`);
});

// Graceful shutdown for the job queue
const shutdownQueue = async (): Promise<void> => {
  try {
    await emailQueue.close(); // Close the queue and stop processing new jobs
    logger.info("Email queue closed gracefully");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error shutting down email queue: ${errorMessage}`);
  }
};

process.on("SIGTERM", shutdownQueue);
process.on("SIGINT", shutdownQueue);

export { emailQueue, addEmailToQueue };
