// src/queues/emailQueue.ts - UPDATED: Check Redis disable flags
import { NoopQueue } from "./noopQueue";

const isProd = process.env.NODE_ENV === "production";
const disableQueue = process.env.DISABLE_EMAIL_QUEUE === "true";

// Also check our Redis disable flags
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

/** Only pull in bullmq *inside* a try/catch and *after* we've checked flags. */
export const emailQueue = (() => {
  if (!isProd || disableQueue || isRedisDisabled) {
    console.warn("⚠️ emailQueue: DISABLED — using NoopQueue");
    if (isRedisDisabled) {
      console.log("🚫 emailQueue: Redis disabled, using NoopQueue");
    }
    return new NoopQueue();
  }

  try {
    // dynamically require so nothing touches Bull until here
    console.log("🔴 emailQueue: Attempting to initialize BullMQ");

    const { Queue } = require("bullmq");

    const host = process.env.REDIS_HOST!;
    const port = parseInt(process.env.REDIS_PORT || "", 10);
    if (!host || isNaN(port)) {
      throw new Error("Missing or invalid REDIS_HOST/REDIS_PORT");
    }

    const q = new Queue("email-jobs", {
      connection: {
        host,
        port,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_USE_TLS === "true" ? {} : undefined,
      },
    });

    q.on("error", (err: Error) => {
      console.error("❌ emailQueue runtime error:", err);
    });

    console.log("✅ emailQueue: BullMQ initialized successfully");
    return q;
  } catch (err) {
    console.warn("⚠️ emailQueue init failed — falling back to NoopQueue:", err);
    return new NoopQueue();
  }
})();
