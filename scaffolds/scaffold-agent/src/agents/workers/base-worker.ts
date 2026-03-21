/**
 * Base worker agent class
 * Workers are stateless, single-purpose agents for atomic tasks
 */

import type { WorkerConfig, WorkerTask } from "../types.js";
import type { AgentResult } from "../../core/types.js";

export abstract class BaseWorker {
  protected config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = {
      model: config.model || "claude-sonnet-4-5",
      maxTurns: config.maxTurns || 5,
      timeout: config.timeout || 30000,
      task: config.task,
      systemPrompt: config.systemPrompt,
    };
  }

  /**
   * Execute the worker task
   */
  async execute(): Promise<AgentResult> {
    const startTime = Date.now();
    const timeout = this.config.timeout || 30000;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Worker timed out after ${timeout}ms`));
        }, timeout);
      });

      // Execute task with timeout
      const resultPromise = this.doExecute();
      const result = await Promise.race([resultPromise, timeoutPromise]);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        output: "",
        metadata: {
          sessionId: `worker_${Date.now()}`,
          agentId: this.config.task.type,
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
   * Actual execution implementation
   */
  protected abstract doExecute(): Promise<AgentResult>;

  /**
   * Get task info
   */
  getTask(): WorkerTask {
    return this.config.task;
  }
}
