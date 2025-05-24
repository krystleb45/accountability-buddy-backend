// src/queues/emailWorker.ts

const isProd = process.env.NODE_ENV === "production";
const disableQueue = process.env.DISABLE_EMAIL_QUEUE === "true";

if (isProd && !disableQueue) {
  try {
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
      },
      { connection: opts }
    ).on("error", (err: Error) => console.error("❌ emailWorker error", err));
  } catch (err) {
    console.warn("⚠️ emailWorker failed to init — disabled:", err);
  }
} else {
  console.warn("⚠️ emailWorker disabled (dev mode or DISABLE_EMAIL_QUEUE)");
}
