/**
 * Telemetry post-tool hook
 * Logs tool usage and provides error context
 */

import type { HookInput, HookContext, HookOutput } from "../types.js";
import { telemetry } from "../../core/telemetry.js";

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private/i,
];

function sanitize(
  input: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) =>
      pattern.test(key)
    );

    if (isSensitive) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 1000) {
      result[key] = `${value.slice(0, 500)}...[truncated ${value.length - 500} chars]`;
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isError(response: unknown): boolean {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const obj = response as Record<string, unknown>;
  return obj.is_error === true || obj.isError === true || obj.error !== undefined;
}

function getErrorMessage(response: unknown): string | undefined {
  if (typeof response !== "object" || response === null) {
    return undefined;
  }

  const obj = response as Record<string, unknown>;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.content === "string") return obj.content;

  return undefined;
}

export async function telemetryHook(
  input: HookInput,
  toolUseId: string | null,
  context: HookContext
): Promise<HookOutput> {
  const { tool_name, tool_input, tool_response } = input;
  const hasError = isError(tool_response);
  const errorMessage = hasError ? getErrorMessage(tool_response) : undefined;

  // Log tool execution
  await telemetry.log({
    event: "tool_execution",
    sessionId: context.sessionId,
    agentId: context.agentId,
    tool: tool_name,
    input: sanitize(tool_input),
    success: !hasError,
    error: errorMessage,
    metadata: {
      toolUseId,
      turnNumber: context.turnNumber,
    },
  });

  // Provide context on errors
  if (hasError) {
    let suggestion = "Consider an alternative approach.";

    // Tool-specific error suggestions
    switch (tool_name) {
      case "Read":
        suggestion = "The file may not exist or may not be readable. Check the path and permissions.";
        break;
      case "Write":
        suggestion = "Check if the directory exists and if you have write permissions.";
        break;
      case "Edit":
        suggestion = "The file may have changed or the old_string may not match exactly.";
        break;
      case "Bash":
        suggestion = "The command may have failed. Check the syntax and required dependencies.";
        break;
      case "WebFetch":
        suggestion = "The URL may be unreachable or may have returned an error.";
        break;
      case "Glob":
        suggestion = "The pattern may not match any files. Try a broader pattern.";
        break;
    }

    return {
      systemMessage: `Tool ${tool_name} failed: ${errorMessage || "Unknown error"}. ${suggestion}`,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: "Error logged for review. Consider retrying with different parameters.",
      },
    };
  }

  return { continue_: true };
}

/**
 * Performance tracking hook
 */
const toolTimings: Map<string, number[]> = new Map();

export async function performanceHook(
  input: HookInput,
  _toolUseId: string | null,
  context: HookContext
): Promise<HookOutput> {
  const { tool_name } = input;

  // Track timing (in production, calculate actual duration)
  const timings = toolTimings.get(tool_name) || [];
  timings.push(Date.now());
  if (timings.length > 100) timings.shift(); // Keep last 100
  toolTimings.set(tool_name, timings);

  await telemetry.log({
    event: "tool_performance",
    sessionId: context.sessionId,
    agentId: context.agentId,
    tool: tool_name,
    metadata: {
      recentCalls: timings.length,
    },
  });

  return { continue_: true };
}
