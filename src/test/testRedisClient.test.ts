import { createClient } from "@redis/client";
import logger from "../utils/winstonLogger";

describe("Redis Client Tests", () => {
  it("should connect to Redis and respond to PING", async () => {
    const redisClient = createClient();
    await redisClient.connect();

    try {
      // Send a PING command to Redis
      const response = await redisClient.sendCommand(["PING"]);
      logger.info(`PING response: ${response}`);

      // Assert the expected response
      expect(response).toBe("PONG");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error in Redis test: ${errorMessage}`);
      throw error; // Re-throw to fail the test in case of an error
    } finally {
      await redisClient.quit();
      logger.info("Redis client disconnected successfully.");
    }
  });
});
