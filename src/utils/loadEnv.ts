// src/utils/loadEnv.ts
import dotenvFlow from "dotenv-flow";
import path from "path";
import { logger } from "./winstonLogger";

export function loadEnvironment(): void {
  const NODE_ENV = process.env.NODE_ENV || "development";

  dotenvFlow.config({
    path: path.resolve(__dirname, "../../"),
    node_env: NODE_ENV,
  });

  logger.info(`✅ Loaded environment for: ${NODE_ENV}`);
}
