/**
 * Progress listener for real-time updates
 */

import { WebSocket } from "ws";
import type { AgentEvent, AgentEventType, Listener } from "./types.js";

export interface ProgressMessage {
  type: "progress";
  status: "started" | "working" | "completed" | "failed";
  taskId?: string;
  tool?: string;
  message?: string;
  error?: string;
  timestamp: number;
}

export class ProgressListener implements Listener {
  name = "progress-listener";
  events: AgentEventType[] = [
    "task_started",
    "task_completed",
    "task_failed",
    "tool_called",
  ];

  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageQueue: ProgressMessage[] = [];

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        console.log(`Progress listener connected to ${this.wsUrl}`);
        this.reconnectAttempts = 0;
        this.flushQueue();
      });

      this.ws.on("close", () => {
        console.log("Progress listener disconnected");
        this.scheduleReconnect();
      });

      this.ws.on("error", (error) => {
        console.error("Progress listener WebSocket error:", error);
      });
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached for progress listener");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`Reconnecting progress listener (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  private send(message: ProgressMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift(); // Keep queue bounded
      }
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  async handler(event: AgentEvent): Promise<void> {
    const timestamp = Date.now();

    switch (event.type) {
      case "task_started":
        this.send({
          type: "progress",
          status: "started",
          taskId: event.taskId,
          message: `Started: ${event.prompt.slice(0, 100)}${event.prompt.length > 100 ? "..." : ""}`,
          timestamp,
        });
        break;

      case "tool_called":
        this.send({
          type: "progress",
          status: "working",
          tool: event.tool,
          message: `Using ${event.tool}...`,
          timestamp,
        });
        break;

      case "task_completed":
        this.send({
          type: "progress",
          status: "completed",
          taskId: event.taskId,
          message: "Task completed successfully",
          timestamp,
        });
        break;

      case "task_failed":
        this.send({
          type: "progress",
          status: "failed",
          taskId: event.taskId,
          error: event.error.message,
          message: "Task failed",
          timestamp,
        });
        break;
    }
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Console-based progress listener (no WebSocket)
 */
export class ConsoleProgressListener implements Listener {
  name = "console-progress-listener";
  events: AgentEventType[] = [
    "task_started",
    "task_completed",
    "task_failed",
    "tool_called",
  ];

  async handler(event: AgentEvent): Promise<void> {
    const timestamp = new Date().toISOString();

    switch (event.type) {
      case "task_started":
        console.log(`[${timestamp}] Task started: ${event.prompt.slice(0, 80)}...`);
        break;

      case "tool_called":
        console.log(`[${timestamp}] Tool: ${event.tool}`);
        break;

      case "task_completed":
        console.log(`[${timestamp}] Task completed: ${event.taskId}`);
        break;

      case "task_failed":
        console.error(`[${timestamp}] Task failed: ${event.error.message}`);
        break;
    }
  }
}
