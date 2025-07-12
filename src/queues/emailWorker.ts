// src/queues/emailWorker.ts - UPDATED: Check Redis disable flags

const isProd = process.env.NODE_ENV === "production";
const disableQueue = process.env.DISABLE_EMAIL_QUEUE === "true";

// Also check our Redis disable flags
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

if (isProd && !disableQueue && !isRedisDisabled) {
  try {
    console.log("🔴 emailWorker: Attempting to initialize BullMQ worker");

    const { Worker } = require("bullmq");
    const host = process.env.REDIS_HOST!;
    const port = Number(process.env.REDIS_PORT!);
    const opts = {
      host,
      port,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_USE_TLS === "true" ? {} : undefined,
    };

    new Worker(
      "email-jobs",
      async (_job: any) => {
        // TODO: implement your mail‐sending logic here
        console.log("📧 Processing email job:", _job.id);
      },
      { connection: opts }
    ).on("error", (err: Error) => console.error("❌ emailWorker error", err));

    console.log("✅ emailWorker: BullMQ worker initialized successfully");
  } catch (err) {
    console.warn("⚠️ emailWorker failed to init — disabled:", err);
  }
} else {
  let reason = "dev mode";
  if (disableQueue) reason = "DISABLE_EMAIL_QUEUE=true";
  if (isRedisDisabled) reason = "Redis disabled";

  console.warn(`⚠️ emailWorker disabled (${reason})`);
  if (isRedisDisabled) {
    console.log("🚫 emailWorker: Redis disabled, worker not started");
  }
}
