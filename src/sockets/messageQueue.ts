// src/sockets/messageQueue.ts - UPDATED: Optional RabbitMQ with fallbacks
import type { Channel, ConsumeMessage, ChannelModel } from "amqplib";
import { logger } from "../utils/winstonLogger";

// Check if message queue is disabled
const isMessageQueueDisabled = process.env.DISABLE_MESSAGE_QUEUE === "true" ||
                              process.env.DISABLE_REDIS === "true" ||
                              process.env.REDIS_DISABLED === "true";

// RabbitMQ configuration (can be replaced with Redis if preferred)
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = process.env.MESSAGE_QUEUE || "chat_messages";

// In-memory message queue for fallback
const memoryMessageQueue: Record<string, unknown>[] = [];

interface QueueConnection {
  connection: ChannelModel;
  channel: Channel;
}

let queueConnection: QueueConnection | null = null;

/**
 * @desc    Initializes a connection to the message queue (RabbitMQ).
 * @returns Promise<QueueConnection> - Returns the connection and channel objects.
 */
const initializeQueue = async (): Promise<QueueConnection | null> => {
  if (isMessageQueueDisabled) {
    logger.info("🚫 Message queue disabled - using in-memory queue");
    return null;
  }

  if (queueConnection) {
    return queueConnection;
  }

  try {
    logger.info("🔴 Attempting to initialize RabbitMQ connection");

    // Dynamic import only when RabbitMQ is enabled
    const amqp = require("amqplib");

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Ensure the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    queueConnection = { connection, channel };
    logger.info("✅ Message queue (RabbitMQ) initialized successfully");
    return queueConnection;
  } catch (error) {
    logger.error(`Failed to initialize message queue: ${(error as Error).message}`);
    logger.warn("⚠️ Falling back to in-memory message queue");
    return null;
  }
};

/**
 * @desc    Publishes a message to the message queue.
 * @param   message - The message object to be queued.
 * @returns Promise<void>
 */
const publishMessage = async (message: Record<string, unknown>): Promise<void> => {
  try {
    const queue = await initializeQueue();

    if (queue && queue.channel) {
      // Use RabbitMQ
      const messageString = JSON.stringify(message);
      queue.channel.sendToQueue(QUEUE_NAME, Buffer.from(messageString), {
        persistent: true, // Ensure messages are stored persistently
      });
      logger.info(`Message published to RabbitMQ queue: ${messageString}`);
    } else {
      // Use in-memory queue
      memoryMessageQueue.push(message);
      logger.info(`Message published to memory queue: ${JSON.stringify(message)}`);

      // Keep memory queue size reasonable
      if (memoryMessageQueue.length > 1000) {
        memoryMessageQueue.splice(0, 100); // Remove oldest 100 messages
      }
    }
  } catch (error) {
    logger.error(`Error publishing message to queue: ${(error as Error).message}`);

    // Fallback to memory queue on error
    try {
      memoryMessageQueue.push(message);
      logger.info(`Message published to fallback memory queue: ${JSON.stringify(message)}`);
    } catch (fallbackError) {
      logger.error(`Failed to publish to fallback queue: ${(fallbackError as Error).message}`);
    }
  }
};

/**
 * @desc    Consumes messages from the message queue and processes them.
 * @param   messageHandler - Callback function to process each message.
 * @returns Promise<void>
 */
const consumeMessages = async (
  messageHandler: (message: Record<string, unknown>) => void,
): Promise<void> => {
  try {
    const queue = await initializeQueue();

    if (queue && queue.channel) {
      // Use RabbitMQ
      await queue.channel.consume(
        QUEUE_NAME,
        (msg: ConsumeMessage | null) => {
          if (msg) {
            const messageContent = msg.content.toString();

            try {
              // Process the message using the provided handler
              const parsedMessage: Record<string, unknown> = JSON.parse(messageContent);
              messageHandler(parsedMessage);

              // Acknowledge the message
              queue.channel.ack(msg);
              logger.info(`Message consumed from RabbitMQ: ${messageContent}`);
            } catch (handlerError) {
              logger.error(
                `Error processing RabbitMQ message: ${(handlerError as Error).message}`,
              );
              // Optionally requeue the message or handle it differently
            }
          }
        },
        { noAck: false }, // Acknowledge messages only after processing
      );

      logger.info("✅ RabbitMQ message consumer started");
    } else {
      // Use in-memory queue - process messages immediately
      logger.info("🚫 Using in-memory message processing (RabbitMQ disabled)");

      // Set up interval to process memory queue messages
      setInterval(() => {
        while (memoryMessageQueue.length > 0) {
          const message = memoryMessageQueue.shift();
          if (message) {
            try {
              messageHandler(message);
              logger.info(`Message consumed from memory queue: ${JSON.stringify(message)}`);
            } catch (handlerError) {
              logger.error(
                `Error processing memory queue message: ${(handlerError as Error).message}`,
              );
            }
          }
        }
      }, 1000); // Process every second
    }
  } catch (error) {
    logger.error(`Error consuming messages from queue: ${(error as Error).message}`);
    logger.warn("⚠️ Message consumption disabled due to error");
  }
};

export { publishMessage, consumeMessages };
