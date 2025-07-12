// src/api/services/JobQueueService.ts - FIXED: Conditional Bull/Redis usage
import { sendEmail } from "./emailService";
import { logger } from "../../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// Mock job queue for when Redis is disabled
class MockJobQueue {
  private jobCounter = 0;

  constructor(name: string) {
    logger.info(`🚫 Mock job queue created: ${name} (Redis disabled)`);
  }

  async add(data: any, options?: any): Promise<{ id: string }> {
    const jobId = `mock-${++this.jobCounter}`;
    logger.info(`🚫 Mock job added: ${jobId}`, { data, options });

    // For email jobs, execute immediately (no queueing)
    if (data.to && data.subject) {
      try {
        logger.info(`🚫 Executing email job immediately: ${data.to}`);
        await sendEmail(data.to, data.subject, data.text || "");
        logger.info(`✅ Mock email job completed: ${jobId}`);
      } catch (error) {
        logger.error(`❌ Mock email job failed: ${jobId}`, error);
      }
    }

    return { id: jobId };
  }

  process(_processor: Function): void {
    logger.info("🚫 Mock job processor registered (will execute immediately)");
  }

  on(event: string, _handler: Function): void {
    logger.info(`🚫 Mock job queue event registered: ${event}`);
  }

  async close(): Promise<void> {
    logger.info("🚫 Mock job queue closed");
  }
}

class JobQueueService {
  private _emailQueue: any;
  private isUsingMock: boolean = false;

  public get emailQueue(): any {
    return this._emailQueue;
  }

  constructor() {
    if (isRedisDisabled) {
      logger.info("🚫 JobQueueService using mock queue (Redis disabled)");
      this._emailQueue = new MockJobQueue("emailQueue");
      this.isUsingMock = true;
    } else {
      logger.info("🔴 JobQueueService attempting to use Redis/Bull");

      try {
        // Dynamic import Bull only when Redis is enabled
        const Queue = require("bull");

        const redisConfig = {
          host: process.env.REDIS_HOST || "127.0.0.1",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
          password: process.env.REDIS_PASSWORD,
          ...(process.env.NODE_ENV === "production" ? { tls: {} } : {}),
        };

        this._emailQueue = new Queue("emailQueue", {
          redis: redisConfig,
          limiter: { max: 1000, duration: 60_000 },
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: "exponential", delay: 2_000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        });

        // Set up real Bull queue processing
        void this._emailQueue.process(this.processEmailJob.bind(this));

        this._emailQueue.on("completed", (job: any) => {
          logger.info(`Email job ${job.id} completed`);
        });

        this._emailQueue.on("failed", (job: any, err: Error) => {
          logger.error(`Email job ${job.id} failed: ${err.message}`);
        });

        this._emailQueue.on("stalled", (job: any) => {
          logger.warn(`Email job ${job.id} stalled and will retry`);
        });

        this._emailQueue.on("error", (err: Error) => {
          logger.error(`Email queue error: ${err.message}`);
          // If Redis fails, fall back to mock
          logger.warn("⚠️ Falling back to mock queue due to Redis error");
          this.fallbackToMock();
        });

        logger.info("✅ JobQueueService initialized with Bull/Redis");

      } catch (error) {
        logger.error(`Failed to initialize Bull queue: ${(error as Error).message}`);
        logger.warn("⚠️ Falling back to mock queue");
        this.fallbackToMock();
      }
    }

    // Graceful shutdown
    process.on("SIGINT", () => void this.shutdown());
    process.on("SIGTERM", () => void this.shutdown());
  }

  private fallbackToMock(): void {
    this._emailQueue = new MockJobQueue("emailQueue-fallback");
    this.isUsingMock = true;
  }

  private async processEmailJob(
    job: any
  ): Promise<void> {
    try {
      const { to, subject, text } = job.data;
      logger.info(`Processing email job ${job.id} → ${to}`);
      await sendEmail(to, subject, text);
      logger.info(`✅ Email job ${job.id} completed successfully`);
    } catch (error) {
      logger.error(`❌ Email job ${job.id} failed:`, error);
      throw error; // Re-throw to trigger Bull's retry mechanism
    }
  }

  public async addEmailJob(
    to: string,
    subject: string,
    text: string,
    priority = 3
  ): Promise<void> {
    try {
      await this.emailQueue.add(
        { to, subject, text },
        { priority, lifo: false }
      );

      if (this.isUsingMock) {
        logger.info(`🚫 Mock email queued to ${to} (executed immediately)`);
      } else {
        logger.info(`Enqueued email to ${to} (priority ${priority})`);
      }
    } catch (error) {
      logger.error(`Failed to add email job: ${(error as Error).message}`);

      // Fallback: send email immediately if queue fails
      try {
        logger.warn(`⚠️ Queue failed, sending email immediately to ${to}`);
        await sendEmail(to, subject, text);
        logger.info(`✅ Email sent directly (bypass queue) to ${to}`);
      } catch (emailError) {
        logger.error(`❌ Failed to send email directly: ${(emailError as Error).message}`);
        throw emailError;
      }
    }
  }

  public async shutdown(): Promise<void> {
    try {
      if (this._emailQueue && typeof this._emailQueue.close === "function") {
        await this._emailQueue.close();
        logger.info("Job queue shut down gracefully");
      } else {
        logger.info("Mock job queue shut down");
      }
    } catch (err: unknown) {
      logger.error(
        "Error shutting down job queue:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // Health check method
  public getStatus(): { isUsingMock: boolean; status: string } {
    return {
      isUsingMock: this.isUsingMock,
      status: this.isUsingMock ? "mock" : "redis"
    };
  }
}

export default new JobQueueService();
