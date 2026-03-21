/**
 * Main agent system orchestration
 */

import { query } from "@anthropic-ai/claude-code";
import type {
  AgentConfig,
  AgentResult,
  AgentResultMetadata,
  ToolCallRecord,
  HookContext,
} from "./types.js";
import { mergeConfig, validateConfig } from "./config.js";
import { telemetry } from "./telemetry.js";
import { AgentEventBus } from "../listeners/event-bus.js";
import { SkillLoader } from "../skills/loader.js";

export interface AgentSystemOptions {
  config?: Partial<AgentConfig>;
  customTools?: unknown[];
}

export class AgentSystem {
  private config: AgentConfig;
  private skillLoader: SkillLoader;
  private sessionId: string;
  private toolCalls: ToolCallRecord[] = [];
  private startTime: number = 0;
  private turnsUsed: number = 0;
  private tokensUsed = { input: 0, output: 0, total: 0 };
  private costUsd: number = 0;

  public eventBus: AgentEventBus;

  constructor(options: AgentSystemOptions = {}) {
    this.config = mergeConfig(options.config || {});
    this.eventBus = new AgentEventBus();
    this.skillLoader = new SkillLoader();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    // Validate configuration
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(", ")}`);
    }

    // Load skills if enabled
    if (this.config.skills.autoLoad) {
      await this.skillLoader.loadSkills(this.config.skills.directory);
    }

    await telemetry.log({
      event: "system_initialized",
      sessionId: this.sessionId,
      agentId: "system",
      metadata: {
        model: this.config.model,
        maxTurns: this.config.maxTurns,
        maxBudgetUsd: this.config.maxBudgetUsd,
      },
    });
  }

  /**
   * Execute a task with the agent system
   */
  async execute(prompt: string): Promise<AgentResult> {
    const taskId = this.generateTaskId();
    this.startTime = Date.now();
    this.toolCalls = [];
    this.turnsUsed = 0;

    // Emit task started event
    this.eventBus.emitEvent({
      type: "task_started",
      taskId,
      prompt,
    } as import("../listeners/types.js").AgentEvent);

    try {
      // Check for relevant skills
      const skill = this.skillLoader.getSkillForContext(prompt);
      const systemPrompt = skill
        ? `${skill.content}\n\n---\nOriginal task: `
        : undefined;

      // Execute using the SDK query function
      const response = query({
        prompt,
        options: {
          maxTurns: this.config.maxTurns,
          model: this.config.model,
          customSystemPrompt: systemPrompt,
        },
      });

      // Process the conversation result
      let output = "";
      for await (const message of response) {
        if (message.type === "result" && message.subtype === "success") {
          output = message.result;
          this.turnsUsed = message.num_turns;
          this.costUsd = message.total_cost_usd;
          this.tokensUsed = {
            input: message.usage.input_tokens,
            output: message.usage.output_tokens,
            total: message.usage.input_tokens + message.usage.output_tokens,
          };
        }
      }

      const metadata = this.buildMetadata(taskId);
      const result: AgentResult = {
        success: true,
        output,
        metadata,
      };

      // Emit task completed event
      this.eventBus.emitEvent({
        type: "task_completed",
        taskId,
        result,
      } as import("../listeners/types.js").AgentEvent);

      await telemetry.log({
        event: "task_completed",
        sessionId: this.sessionId,
        agentId: taskId,
        success: true,
        metadata: {
          turnsUsed: this.turnsUsed,
          duration: Date.now() - this.startTime,
        },
      });

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Emit task failed event
      this.eventBus.emitEvent({
        type: "task_failed",
        taskId,
        error: err,
      } as import("../listeners/types.js").AgentEvent);

      await telemetry.log({
        event: "task_failed",
        sessionId: this.sessionId,
        agentId: taskId,
        success: false,
        error: err.message,
      });

      return {
        success: false,
        output: "",
        metadata: this.buildMetadata(taskId),
        error: err,
      };
    }
  }

  /**
   * Execute with streaming output
   */
  async *executeStream(
    prompt: string
  ): AsyncGenerator<string, AgentResult, unknown> {
    const taskId = this.generateTaskId();
    this.startTime = Date.now();
    this.toolCalls = [];
    this.turnsUsed = 0;

    this.eventBus.emitEvent({
      type: "task_started",
      taskId,
      prompt,
    } as import("../listeners/types.js").AgentEvent);

    try {
      const response = query({
        prompt,
        options: {
          maxTurns: this.config.maxTurns,
          model: this.config.model,
          includePartialMessages: true,
        },
      });

      let output = "";

      for await (const message of response) {
        if (message.type === "stream_event") {
          // Handle streaming events
          const event = message.event;
          if (event.type === "content_block_delta" && "delta" in event) {
            const delta = event.delta as { type: string; text?: string };
            if (delta.type === "text_delta" && delta.text) {
              output += delta.text;
              yield delta.text;
            }
          }
        } else if (message.type === "result" && message.subtype === "success") {
          output = message.result;
          this.turnsUsed = message.num_turns;
          this.costUsd = message.total_cost_usd;
        }
      }

      const metadata = this.buildMetadata(taskId);
      const result: AgentResult = {
        success: true,
        output,
        metadata,
      };

      this.eventBus.emitEvent({
        type: "task_completed",
        taskId,
        result,
      } as import("../listeners/types.js").AgentEvent);

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.eventBus.emitEvent({
        type: "task_failed",
        taskId,
        error: err,
      } as import("../listeners/types.js").AgentEvent);

      return {
        success: false,
        output: "",
        metadata: this.buildMetadata(taskId),
        error: err,
      };
    }
  }

  /**
   * Get the current context for hooks
   */
  getHookContext(): HookContext {
    return {
      sessionId: this.sessionId,
      agentId: "system",
      turnNumber: this.turnsUsed,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(partial: Partial<AgentConfig>): void {
    this.config = mergeConfig({ ...this.config, ...partial });
  }

  /**
   * Shutdown the system cleanly
   */
  async shutdown(): Promise<void> {
    await telemetry.log({
      event: "system_shutdown",
      sessionId: this.sessionId,
      agentId: "system",
    });

    telemetry.shutdown();
  }

  private buildMetadata(taskId: string): AgentResultMetadata {
    return {
      sessionId: this.sessionId,
      agentId: taskId,
      turnsUsed: this.turnsUsed,
      tokensUsed: this.tokensUsed,
      costUsd: this.costUsd,
      toolCalls: this.toolCalls,
      duration: Date.now() - this.startTime,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Create a new agent system instance
 */
export function createAgentSystem(
  options?: AgentSystemOptions
): AgentSystem {
  return new AgentSystem(options);
}
