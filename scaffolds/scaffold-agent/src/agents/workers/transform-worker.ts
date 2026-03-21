/**
 * Transform Worker Agent
 * Handles atomic data transformation operations
 */

import { query } from "@anthropic-ai/claude-code";
import { BaseWorker } from "./base-worker.js";
import type { WorkerTask } from "../types.js";
import type { AgentResult } from "../../core/types.js";

const TRANSFORM_WORKER_PROMPT = `You are a Transform Worker Agent. Execute data transformations precisely.

Guidelines:
1. Parse input data correctly
2. Apply the exact transformation requested
3. Validate output format
4. Report any errors in input data
5. Do not infer additional transformations
`;

export interface TransformTask extends WorkerTask {
  type: "transform";
  transformationType: "json" | "csv" | "text" | "code";
  input: string;
  transformation: string;
  outputFormat?: string;
}

export class TransformWorker extends BaseWorker {
  constructor(task: TransformTask) {
    super({
      task,
      systemPrompt: TRANSFORM_WORKER_PROMPT,
      maxTurns: 3,
    });
  }

  protected async doExecute(): Promise<AgentResult> {
    const task = this.config.task as TransformTask;

    const instruction = `Transform this ${task.transformationType} data:

Input:
${task.input}

Transformation: ${task.transformation}
${task.outputFormat ? `Output format: ${task.outputFormat}` : ""}

Apply the transformation and return the result.`;

    const response = query({
      prompt: instruction,
      options: {
        customSystemPrompt: TRANSFORM_WORKER_PROMPT,
        maxTurns: this.config.maxTurns,
      },
    });

    let output = "";
    for await (const message of response) {
      if (message.type === "result" && message.subtype === "success") {
        output = message.result;
      }
    }

    return {
      success: true,
      output,
      metadata: {
        sessionId: `transform_worker_${Date.now()}`,
        agentId: "transform-worker",
        turnsUsed: 0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        costUsd: 0,
        toolCalls: [],
        duration: 0,
      },
    };
  }

  /**
   * Static factory for quick execution
   */
  static async run(task: TransformTask): Promise<AgentResult> {
    const worker = new TransformWorker(task);
    return worker.execute();
  }
}
