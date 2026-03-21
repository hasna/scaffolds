/**
 * Hook registry and configuration
 */

import type { HooksConfig, HookMatcher, HookFunction, HookInput, HookContext, HookOutput } from "./types.js";
import { securityValidationHook } from "./pre/security-validation.js";
import { rateLimitHook } from "./pre/rate-limit.js";
import { telemetryHook, performanceHook } from "./post/telemetry-hook.js";

/**
 * Create a hook matcher
 */
export function createHookMatcher(
  matcher: string | null,
  hooks: HookFunction[]
): HookMatcher {
  return { matcher, hooks };
}

/**
 * Create the default hooks configuration
 */
export function createHooksConfig(options?: {
  enableSecurityValidation?: boolean;
  enableRateLimit?: boolean;
  enableTelemetry?: boolean;
  enablePerformance?: boolean;
}): HooksConfig {
  const {
    enableSecurityValidation = true,
    enableRateLimit = true,
    enableTelemetry = true,
    enablePerformance = false,
  } = options || {};

  const preToolUse: HookMatcher[] = [];
  const postToolUse: HookMatcher[] = [];

  // Pre-tool hooks
  if (enableRateLimit) {
    preToolUse.push(createHookMatcher(null, [rateLimitHook]));
  }

  if (enableSecurityValidation) {
    // Apply security validation to specific tools
    preToolUse.push(
      createHookMatcher("Bash", [securityValidationHook]),
      createHookMatcher("Write", [securityValidationHook]),
      createHookMatcher("Edit", [securityValidationHook]),
      createHookMatcher("Read", [securityValidationHook]),
      createHookMatcher("WebFetch", [securityValidationHook])
    );
  }

  // Post-tool hooks
  if (enableTelemetry) {
    postToolUse.push(createHookMatcher(null, [telemetryHook]));
  }

  if (enablePerformance) {
    postToolUse.push(createHookMatcher(null, [performanceHook]));
  }

  return {
    PreToolUse: preToolUse,
    PostToolUse: postToolUse,
  };
}

/**
 * Hook executor
 */
export class HookExecutor {
  private config: HooksConfig;

  constructor(config?: HooksConfig) {
    this.config = config || createHooksConfig();
  }

  /**
   * Execute pre-tool hooks
   */
  async executePreToolHooks(
    input: HookInput,
    toolUseId: string | null,
    context: HookContext
  ): Promise<HookOutput> {
    return this.executeHooks("PreToolUse", input, toolUseId, context);
  }

  /**
   * Execute post-tool hooks
   */
  async executePostToolHooks(
    input: HookInput,
    toolUseId: string | null,
    context: HookContext
  ): Promise<HookOutput> {
    return this.executeHooks("PostToolUse", input, toolUseId, context);
  }

  /**
   * Execute hooks for a specific event
   */
  private async executeHooks(
    event: keyof HooksConfig,
    input: HookInput,
    toolUseId: string | null,
    context: HookContext
  ): Promise<HookOutput> {
    const matchers = this.config[event] || [];
    let combinedOutput: HookOutput = {};

    for (const matcher of matchers) {
      // Check if this matcher applies to the tool
      if (matcher.matcher !== null && matcher.matcher !== input.tool_name) {
        continue;
      }

      // Execute all hooks in this matcher
      for (const hook of matcher.hooks) {
        try {
          const output = await hook(input, toolUseId, context);

          // Merge outputs
          combinedOutput = this.mergeOutputs(combinedOutput, output);

          // Stop if permission denied
          if (output.hookSpecificOutput?.permissionDecision === "deny") {
            return combinedOutput;
          }

          // Stop if explicitly told to stop
          if (output.continue_ === false) {
            return combinedOutput;
          }
        } catch (error) {
          console.error(`Hook execution failed:`, error);
          // Continue to next hook on error
        }
      }
    }

    return combinedOutput;
  }

  /**
   * Merge two hook outputs
   */
  private mergeOutputs(a: HookOutput, b: HookOutput): HookOutput {
    return {
      continue_: b.continue_ ?? a.continue_,
      systemMessage: b.systemMessage || a.systemMessage,
      stopReason: b.stopReason || a.stopReason,
      hookSpecificOutput: b.hookSpecificOutput || a.hookSpecificOutput,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: HooksConfig): void {
    this.config = config;
  }

  /**
   * Add a hook matcher
   */
  addMatcher(event: keyof HooksConfig, matcher: HookMatcher): void {
    if (!this.config[event]) {
      this.config[event] = [];
    }
    this.config[event]!.push(matcher);
  }
}

// Singleton executor
export const hookExecutor = new HookExecutor();
