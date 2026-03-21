/**
 * Rate limiting pre-tool hook
 * Prevents excessive tool usage
 */

import type { HookInput, HookContext, HookOutput } from "../types.js";

interface RateLimitState {
  calls: number;
  windowStart: number;
}

// Per-tool rate limits
const toolLimits: Record<string, { calls: number; windowMs: number }> = {
  Bash: { calls: 60, windowMs: 60000 }, // 60 calls per minute
  Write: { calls: 30, windowMs: 60000 }, // 30 writes per minute
  Edit: { calls: 60, windowMs: 60000 }, // 60 edits per minute
  WebFetch: { calls: 30, windowMs: 60000 }, // 30 fetches per minute
  WebSearch: { calls: 20, windowMs: 60000 }, // 20 searches per minute
  Task: { calls: 10, windowMs: 60000 }, // 10 subagent spawns per minute
};

// Global rate limit
const globalLimit = { calls: 300, windowMs: 60000 };

// State tracking
const toolState: Map<string, RateLimitState> = new Map();
let globalState: RateLimitState = { calls: 0, windowStart: Date.now() };

function checkLimit(
  state: RateLimitState,
  limit: { calls: number; windowMs: number }
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();

  // Reset window if expired
  if (now - state.windowStart >= limit.windowMs) {
    state.calls = 0;
    state.windowStart = now;
  }

  const remaining = Math.max(0, limit.calls - state.calls);
  const resetMs = state.windowStart + limit.windowMs - now;

  return {
    allowed: state.calls < limit.calls,
    remaining,
    resetMs,
  };
}

export async function rateLimitHook(
  input: HookInput,
  _toolUseId: string | null,
  _context: HookContext
): Promise<HookOutput> {
  const { tool_name } = input;
  const now = Date.now();

  // Check global limit
  const globalCheck = checkLimit(globalState, globalLimit);
  if (!globalCheck.allowed) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Global rate limit exceeded. Resets in ${Math.ceil(globalCheck.resetMs / 1000)}s`,
      },
    };
  }

  // Check tool-specific limit
  const toolLimit = toolLimits[tool_name];
  if (toolLimit) {
    let state = toolState.get(tool_name);
    if (!state) {
      state = { calls: 0, windowStart: now };
      toolState.set(tool_name, state);
    }

    const toolCheck = checkLimit(state, toolLimit);
    if (!toolCheck.allowed) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Rate limit for ${tool_name} exceeded (${toolLimit.calls} calls/min). Resets in ${Math.ceil(toolCheck.resetMs / 1000)}s`,
        },
      };
    }

    // Increment counter
    state.calls++;
  }

  // Increment global counter
  globalState.calls++;

  return {};
}

/**
 * Reset rate limit state (for testing)
 */
export function resetRateLimits(): void {
  toolState.clear();
  globalState = { calls: 0, windowStart: Date.now() };
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): {
  global: { used: number; limit: number; resetMs: number };
  tools: Record<string, { used: number; limit: number; resetMs: number }>;
} {
  const now = Date.now();

  const globalStatus = {
    used: globalState.calls,
    limit: globalLimit.calls,
    resetMs: Math.max(0, globalState.windowStart + globalLimit.windowMs - now),
  };

  const toolsStatus: Record<
    string,
    { used: number; limit: number; resetMs: number }
  > = {};

  for (const [name, limit] of Object.entries(toolLimits)) {
    const state = toolState.get(name);
    if (state) {
      toolsStatus[name] = {
        used: state.calls,
        limit: limit.calls,
        resetMs: Math.max(0, state.windowStart + limit.windowMs - now),
      };
    }
  }

  return { global: globalStatus, tools: toolsStatus };
}
