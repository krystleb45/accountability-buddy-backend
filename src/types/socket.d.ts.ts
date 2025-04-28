// types/global.d.ts
import { Server as SocketIOServer } from "socket.io";

declare global {
  var io: SocketIOServer; // Add io to the global namespace
}
