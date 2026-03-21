/**
 * Hook type definitions
 */

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
    additionalContext?: string;
  };
}

export type HookFunction = (
  input: HookInput,
  toolUseId: string | null,
  context: HookContext
) => Promise<HookOutput>;

export interface HookMatcher {
  matcher: string | null; // null matches all tools
  hooks: HookFunction[];
}

export interface HooksConfig {
  PreToolUse?: HookMatcher[];
  PostToolUse?: HookMatcher[];
  PreSubagent?: HookMatcher[];
  PostSubagent?: HookMatcher[];
  OnError?: HookMatcher[];
  OnComplete?: HookMatcher[];
}
