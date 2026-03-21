/**
 * Listener type definitions
 */

import type { AgentResult } from "../core/types.js";

export type AgentEventType =
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "tool_called"
  | "tool_result"
  | "subagent_spawned"
  | "subagent_completed"
  | "context_limit_warning"
  | "budget_warning";

export type AgentEvent =
  | { type: "task_started"; taskId: string; prompt: string }
  | { type: "task_completed"; taskId: string; result: AgentResult }
  | { type: "task_failed"; taskId: string; error: Error }
  | { type: "tool_called"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; output: unknown; success: boolean }
  | { type: "subagent_spawned"; agentId: string; purpose: string }
  | { type: "subagent_completed"; agentId: string; result: AgentResult }
  | { type: "context_limit_warning"; usage: number; limit: number }
  | { type: "budget_warning"; spent: number; limit: number };

export interface Listener {
  name: string;
  events: AgentEventType[];
  handler: (event: AgentEvent) => Promise<void>;
}

export interface ListenerOptions {
  enabled?: boolean;
  filter?: (event: AgentEvent) => boolean;
}
