// src/api/services/JobQueueService.ts
import Queue from "bull";
import { sendEmail } from "./emailService";
import { logger } from "../../utils/winstonLogger";

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
  ...(process.env.NODE_ENV === "production" ? { tls: {} } : {}),
};

class JobQueueService {
  public readonly emailQueue: Queue.Queue;

  constructor() {
    this.emailQueue = new Queue("emailQueue", {
      redis: redisConfig,
      limiter: { max: 1000, duration: 60_000 },
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Prefix with void to mark we intentionally don't await
    void this.emailQueue.process(this.processEmailJob.bind(this));

    // These .on() calls don't return promises, so they're fine:
    this.emailQueue.on("completed", (job) => {
      logger.info(`Email job ${job.id} completed`);
    });
    this.emailQueue.on("failed", (job, err) => {
      logger.error(`Email job ${job.id} failed: ${err.message}`);
    });
    this.emailQueue.on("stalled", (job) => {
      logger.warn(`Email job ${job.id} stalled and will retry`);
    });
    this.emailQueue.on("error", (err) => {
      logger.error(`Email queue error: ${err.message}`);
    });

    // Graceful shutdown
    process.on("SIGINT", () => void this.shutdown());
    process.on("SIGTERM", () => void this.shutdown());
  }

  private async processEmailJob(
    job: Queue.Job<{ to: string; subject: string; text: string }>
  ): Promise<void> {
    const { to, subject, text } = job.data;
    logger.info(`Processing email job ${job.id} → ${to}`);
    await sendEmail(to, subject, text);
  }

  public async addEmailJob(
    to: string,
    subject: string,
    text: string,
    priority = 3
  ): Promise<void> {
    await this.emailQueue.add(
      { to, subject, text },
      { priority, lifo: false }
    );
    logger.info(`Enqueued email to ${to} (priority ${priority})`);
  }

  public async shutdown(): Promise<void> {
    try {
      await this.emailQueue.close();
      logger.info("Email queue shut down gracefully");
    } catch (err: unknown) {
      logger.error(
        "Error shutting down email queue:",
        err instanceof Error ? err.message : err
      );
    }
  }
}

export default new JobQueueService();
