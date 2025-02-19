import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";

/**
 * Custom type to extend the socket object with user information.
 */
interface AuthenticatedSocket extends Socket {
  user?: JwtPayload | string;
}

/**
 * @desc    Middleware to authenticate socket connections using JWT.
 * @param   {AuthenticatedSocket} socket - The socket object representing the client's connection.
 * @param   {Function} next - Callback function to proceed to the next middleware or connection handler.
 * @returns {void}
 */
const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
): void => {
  try {
    // Extract token from query params or headers
    const token =
      (socket.handshake.query.token as string) ||
      (socket.handshake.headers["authorization"] as string);

    if (!token) {
      const err = new Error("Authentication error: No token provided");
      Object.assign(err, { data: { details: "Token is missing or invalid" } }); // Attach additional details
      return next(err);
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if (err) {
        const authError = new Error("Authentication error: Invalid token");
        Object.assign(authError, { data: { details: "Token verification failed" } }); // Attach additional details
        return next(authError);
      }

      // Attach user information to the socket object
      socket.user = decoded;
      return next();
    });
  } catch (error) {
    // Handle unexpected errors during authentication
    const unexpectedError = new Error("Authentication error: Unexpected error");
    Object.assign(unexpectedError, { data: { details: (error as Error).message } }); // Include error details
    return next(unexpectedError);
  }
};

export default socketAuthMiddleware;
