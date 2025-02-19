import type { Server, Socket } from "socket.io";

/**
 * Centralized Error Handler for Socket.IO
 * Logs and handles errors to ensure stability during socket events.
 */

// Interface for custom error types
interface SocketError extends Error {
  statusCode?: number;
  clientMessage?: string;
}

/**
 * Logs errors to the console or a logging service
 * @param _error - The error object
 * @param context - Context about where the error occurred
 */
const logError = (_error: Error, _p0: string): void => {
  
  // Optional: Add external logging service integration here (e.g., Sentry)
};

/**
 * Sends a generic error message to the client
 * @param socket - The client socket
 * @param error - The error object
 */
const sendErrorToClient = (socket: Socket, error: SocketError): void => {
  const clientMessage = error.clientMessage || "An unexpected error occurred.";
  socket.emit("error", { message: clientMessage });
};

/**
 * Middleware to wrap socket events with error handling
 * @param handler - The socket event handler
 * @returns A wrapped handler with error handling
 */
const withErrorHandler =
  (handler: (socket: Socket, ...args: any[]) => Promise<void>) =>
    async (socket: Socket, ...args: any[]): Promise<void> => {
      try {
        await handler(socket, ...args);
      } catch (error) {
        logError(error as Error, "Event Handler");
        sendErrorToClient(socket, error as SocketError);
      }
    };

/**
 * Attaches a global error listener to the server
 * @param io - The Socket.IO server instance
 */
const attachGlobalErrorHandler = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    // Global error handling for the socket
    socket.on("error", (error: Error) => {
      logError(error, "Socket Connection");
      sendErrorToClient(socket, {
        ...error,
        clientMessage: "A connection error occurred.",
      });
    });

    // Handle disconnect errors
    socket.on("disconnect", () => {
      
    });
  });
};

export {
  logError,
  sendErrorToClient,
  withErrorHandler,
  attachGlobalErrorHandler,
};
