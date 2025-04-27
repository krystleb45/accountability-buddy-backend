import { SecretsManager } from "aws-sdk";
import { config as dotenvConfig } from "dotenv";
import { logger } from "./winstonLogger";  // use your logger, not console

dotenvConfig(); // fallback to .env

const secretsClient = new SecretsManager({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function loadSecretsFromAWS(): Promise<void> {
  const secretName = process.env.AWS_SECRET_NAME;

  if (!secretName) {
    logger.warn("⚠️ No AWS_SECRET_NAME provided. Skipping secrets loading.");
    return;
  }

  try {
    const data = await secretsClient.getSecretValue({ SecretId: secretName }).promise();
    const secrets = JSON.parse(data.SecretString || "{}");

    for (const [key, value] of Object.entries(secrets)) {
      (process.env as any)[key] = value;
    }

    logger.info("✅ AWS secrets loaded successfully.");
  } catch (error) {
    // Let startServer’s catch handle the exit & show the stack
    logger.error("❌ Failed to load AWS secrets:", error);
    throw error;
  }
}
