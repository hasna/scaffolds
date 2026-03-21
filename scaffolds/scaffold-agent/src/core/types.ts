/**
 * Core type definitions for the agent scaffold
 */

import type { z } from "zod";

// Agent configuration
export interface AgentConfig {
  model: ModelName;
  maxTurns: number;
  maxBudgetUsd: number;
  permissionMode: PermissionMode;
  permissionPolicy?: string;
  tools: ToolsConfig;
  hooks: HooksConfig;
  skills: SkillsConfig;
  listeners: ListenersConfig;
  agents: AgentsConfig;
}

export type ModelName =
  | "claude-sonnet-4-5"
  | "claude-opus-4-5"
  | "claude-3-5-sonnet"
  | "claude-3-5-haiku";

export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "bypassPermissions"
  | "plan";

// Tools configuration
export interface ToolsConfig {
  builtin: BuiltinTool[];
  custom: string[];
}

export type BuiltinTool =
  | "Read"
  | "Write"
  | "Edit"
  | "Bash"
  | "Glob"
  | "Grep"
  | "WebSearch"
  | "WebFetch"
  | "Task";

// Hooks configuration
export interface HooksConfig {
  enableSecurityValidation: boolean;
  enableTelemetry: boolean;
  enableRateLimit: boolean;
}

// Skills configuration
export interface SkillsConfig {
  directory: string;
  autoLoad: boolean;
}

// Listeners configuration
export interface ListenersConfig {
  progress: {
    enabled: boolean;
    wsUrl?: string;
  };
  budget: {
    enabled: boolean;
    limit: number;
  };
}

// Agent hierarchy configuration
export interface AgentsConfig {
  orchestrator: {
    enabled: boolean;
    maxDelegationDepth: number;
  };
  specialists: SpecialistType[];
  workers: {
    maxConcurrent: number;
    timeout: number;
  };
}

export type SpecialistType = "code" | "research" | "data" | "security";

// Agent execution result
export interface AgentResult {
  success: boolean;
  output: string;
  metadata: AgentResultMetadata;
  error?: Error;
}

export interface AgentResultMetadata {
  sessionId: string;
  agentId: string;
  turnsUsed: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
  toolCalls: ToolCallRecord[];
  duration: number;
}

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  success: boolean;
  timestamp: number;
  duration: number;
}

// Hook types
export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "PreSubagent"
  | "PostSubagent"
  | "OnError"
  | "OnComplete";

export interface HookContext {
  sessionId: string;
  agentId: string;
  turnNumber: number;
  parentContext?: HookContext;
}

export interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response?: unknown;
}

export interface HookOutput {
  continue_?: boolean;
  systemMessage?: string;
  stopReason?: string;
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision?: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
  };
}

export type HookFunction = (
  input: HookInput,
  toolUseId: string | null,
  context: HookContext
) => Promise<HookOutput>;

// Tool types
export interface ToolDefinition<T extends z.ZodObject<z.ZodRawShape>> {
  name: string;
  description: string;
  inputSchema: T;
  handler: (args: z.infer<T>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
}

export type ToolResultContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

// Permission types
export interface PermissionPolicy {
  name: string;
  description: string;
  rules: PermissionRule[];
}

export interface PermissionRule {
  tool: string | "*";
  action: "allow" | "deny" | "ask";
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  pathPatterns?: string[];
  commandPatterns?: string[];
  timeRestriction?: { start: string; end: string };
  rateLimit?: { calls: number; window: string };
}

// Event types
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
  events: AgentEvent["type"][];
  handler: (event: AgentEvent) => Promise<void>;
}

// Skill types
export interface Skill {
  name: string;
  description: string;
  version: string;
  content: string;
  activationKeywords: string[];
  autoActivate: boolean;
  tokenBudget: number;
  scripts: Map<string, string>;
  references: Map<string, string>;
}

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  activation_keywords?: string[];
  auto_activate?: boolean;
  token_budget?: number;
}
