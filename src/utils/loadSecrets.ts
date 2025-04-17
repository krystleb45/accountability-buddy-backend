import { SecretsManager } from "aws-sdk";
import { config as dotenvConfig } from "dotenv";

dotenvConfig(); // fallback to .env

const secretsClient = new SecretsManager({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function loadSecretsFromAWS(): Promise<void> {
  const secretName = process.env.AWS_SECRET_NAME;

  if (!secretName) {
    console.warn("⚠️ No AWS_SECRET_NAME provided. Skipping secrets loading.");
    return;
  }

  try {
    const data = await secretsClient.getSecretValue({ SecretId: secretName }).promise();
    const secrets = JSON.parse(data.SecretString || "{}");

    for (const [key, value] of Object.entries(secrets)) {
      (process.env as any)[key as string] = value;
    }

    console.warn("✅ AWS secrets loaded successfully.");
  } catch (error) {
    console.error("❌ Failed to load AWS secrets:", error);
    process.exit(1);
  }
}
