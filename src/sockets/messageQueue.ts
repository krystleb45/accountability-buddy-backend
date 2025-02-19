import type { Connection, Channel, ConsumeMessage } from "amqplib";
import amqp from "amqplib"; // RabbitMQ library for message queuing
import logger from "../utils/winstonLogger"; // Winston logger for logging

// RabbitMQ configuration (can be replaced with Redis if preferred)
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = process.env.MESSAGE_QUEUE || "chat_messages";

interface QueueConnection {
  connection: Connection;
  channel: Channel;
}

/**
 * @desc    Initializes a connection to the message queue (RabbitMQ).
 * @returns Promise<QueueConnection> - Returns the connection and channel objects.
 */
const initializeQueue = async (): Promise<QueueConnection> => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Ensure the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    logger.info("Message queue initialized successfully");
    return { connection, channel };
  } catch (error) {
    logger.error(`Failed to initialize message queue: ${(error as Error).message}`);
    throw new Error("Failed to initialize message queue");
  }
};

/**
 * @desc    Publishes a message to the message queue.
 * @param   message - The message object to be queued.
 * @returns Promise<void>
 */
const publishMessage = async (message: Record<string, unknown>): Promise<void> => {
  try {
    const { channel } = await initializeQueue();

    // Ensure message is a string before publishing
    const messageString = JSON.stringify(message);

    channel.sendToQueue(QUEUE_NAME, Buffer.from(messageString), {
      persistent: true, // Ensure messages are stored persistently
    });

    logger.info(`Message published to queue: ${messageString}`);
  } catch (error) {
    logger.error(`Error publishing message to queue: ${(error as Error).message}`);
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
    const { channel } = await initializeQueue();

    // Consume messages from the queue
    await channel.consume(
      QUEUE_NAME,
      (msg: ConsumeMessage | null) => {
        if (msg) {
          const messageContent = msg.content.toString();

          try {
            // Process the message using the provided handler
            const parsedMessage: Record<string, unknown> = JSON.parse(messageContent);
            messageHandler(parsedMessage);

            // Acknowledge the message
            channel.ack(msg);
            logger.info(`Message consumed: ${messageContent}`);
          } catch (handlerError) {
            logger.error(
              `Error processing message: ${(handlerError as Error).message}`,
            );
            // Optionally requeue the message or handle it differently
          }
        }
      },
      { noAck: false }, // Acknowledge messages only after processing
    );
  } catch (error) {
    logger.error(`Error consuming messages from queue: ${(error as Error).message}`);
  }
};

export { publishMessage, consumeMessages };
