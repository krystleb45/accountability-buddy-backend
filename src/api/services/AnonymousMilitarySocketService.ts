// src/api/services/AnonymousMilitarySocketService.ts - FIXED: Added return types

import { Server as SocketIOServer } from "socket.io";
import { AnonymousSession } from "../models/AnonymousMilitaryChat";

export class AnonymousMilitarySocketService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupNamespace();
  }

  private setupNamespace(): void {
    const militaryNamespace = this.io.of("/anonymous-military-chat");

    militaryNamespace.on("connection", (socket) => {
      console.log("Anonymous military chat user connected:", socket.id);

      socket.on("join-room", async (data: { room: string, sessionId: string, displayName: string }) => {
        await this.handleSocketJoin(socket, data);
      });

      socket.on("disconnect", async () => {
        await this.handleSocketDisconnect(socket);
      });
    });
  }

  private async handleSocketJoin(socket: any, data: { room: string, sessionId: string, displayName: string }): Promise<void> {
    try {
      socket.join(data.room);
      socket.sessionId = data.sessionId;
      socket.room = data.room;

      // Update session activity
      await AnonymousSession.findOneAndUpdate(
        { sessionId: data.sessionId },
        { lastActive: new Date() }
      );

      // Get member count
      const memberCount = await AnonymousSession.countDocuments({
        room: data.room,
        lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      // Notify room of updated member count
      socket.to(data.room).emit("member-count-updated", { memberCount });
      socket.emit("joined-successfully", { memberCount });

    } catch (error) {
      console.error("Error handling socket join:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  }

  private async handleSocketDisconnect(socket: any): Promise<void> {
    if (socket.room && socket.sessionId) {
      // Update member count
      const memberCount = await AnonymousSession.countDocuments({
        room: socket.room,
        lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      socket.to(socket.room).emit("member-count-updated", { memberCount });
    }
  }

  public handleNewMessage(room: string, message: any): void {
    this.io.of("/anonymous-military-chat").to(room).emit("new-message", message);
  }

  public handleUserJoin(room: string, _displayName: string, memberCount: number): void {
    this.io.of("/anonymous-military-chat").to(room).emit("user-joined", {
      message: "Someone joined the conversation",
      memberCount
    });
  }

  public handleUserLeave(room: string, _displayName: string, memberCount: number): void {
    this.io.of("/anonymous-military-chat").to(room).emit("user-left", {
      memberCount
    });
  }

  public handleCrisisDetection(room: string, _sessionId: string): void {
    this.io.of("/anonymous-military-chat").to(room).emit("crisis-resources", {
      message: "If you or someone you know is in crisis, help is available. Call 988 for the Veterans Crisis Line.",
      resources: [
        { name: "Veterans Crisis Line", phone: "988 (Press 1)", text: "838255" },
        { name: "National Suicide Prevention", phone: "988" }
      ]
    });
  }
}
