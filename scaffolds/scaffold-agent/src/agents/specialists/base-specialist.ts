/**
 * Base specialist agent class
 */

import { query } from "@anthropic-ai/claude-code";
import type { SpecialistAgent, SpecialistConfig, SpecialistDomain } from "../types.js";
import type { AgentResult } from "../../core/types.js";

export abstract class BaseSpecialist implements SpecialistAgent {
  protected config: SpecialistConfig;
  public domain: SpecialistDomain;

  constructor(config: SpecialistConfig) {
    this.config = {
      model: config.model || "claude-sonnet-4-5",
      maxTurns: config.maxTurns || 20,
      domain: config.domain,
      tools: config.tools,
      systemPrompt: config.systemPrompt,
    };
    this.domain = config.domain;
  }

  /**
   * Execute a task
   */
  async execute(task: string): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const response = query({
        prompt: task,
        options: {
          customSystemPrompt: this.config.systemPrompt,
          maxTurns: this.config.maxTurns,
          model: this.config.model,
        },
      });

      let output = "";
      let turnsUsed = 0;
      let costUsd = 0;
      const tokensUsed = { input: 0, output: 0, total: 0 };

      for await (const message of response) {
        if (message.type === "result" && message.subtype === "success") {
          output = message.result;
          turnsUsed = message.num_turns;
          costUsd = message.total_cost_usd;
          tokensUsed.input = message.usage.input_tokens;
          tokensUsed.output = message.usage.output_tokens;
          tokensUsed.total = tokensUsed.input + tokensUsed.output;
        }
      }

      return {
        success: true,
        output,
        metadata: {
          sessionId: `${this.domain}_${Date.now()}`,
          agentId: this.domain,
          turnsUsed,
          tokensUsed,
          costUsd,
          toolCalls: [],
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        output: "",
        metadata: {
          sessionId: `${this.domain}_${Date.now()}`,
          agentId: this.domain,
          turnsUsed: 0,
          tokensUsed: { input: 0, output: 0, total: 0 },
          costUsd: 0,
          toolCalls: [],
          duration: Date.now() - startTime,
        },
        error: err,
      };
    }
  }

  /**
   * Get domain
   */
  getDomain(): SpecialistDomain {
    return this.domain;
  }

  /**
   * Get available tools
   */
  getTools(): string[] {
    return this.config.tools;
  }
}
