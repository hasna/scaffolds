/**
 * Search Worker Agent
 * Handles atomic search operations
 */

import { query } from "@anthropic-ai/claude-code";
import { BaseWorker } from "./base-worker.js";
import type { WorkerTask } from "../types.js";
import type { AgentResult } from "../../core/types.js";

const SEARCH_WORKER_PROMPT = `You are a Search Worker Agent. Execute search operations precisely.

Available tools:
- Glob: Find files by pattern
- Grep: Search file contents

Guidelines:
1. Use the most efficient search method
2. Return relevant matches only
3. Format results clearly
4. Do not modify any files
`;

export interface SearchTask extends WorkerTask {
  type: "search";
  searchType: "files" | "content";
  pattern: string;
  path?: string;
  options?: {
    caseSensitive?: boolean;
    includeHidden?: boolean;
    maxResults?: number;
  };
}

export class SearchWorker extends BaseWorker {
  constructor(task: SearchTask) {
    super({
      task,
      systemPrompt: SEARCH_WORKER_PROMPT,
      maxTurns: 3,
    });
  }

  protected async doExecute(): Promise<AgentResult> {
    const task = this.config.task as SearchTask;

    let instruction = "";
    if (task.searchType === "files") {
      instruction = `Find files matching pattern: ${task.pattern}`;
      if (task.path) instruction += ` in ${task.path}`;
    } else {
      instruction = `Search for "${task.pattern}" in file contents`;
      if (task.path) instruction += ` within ${task.path}`;
    }

    if (task.options?.maxResults) {
      instruction += `. Limit to ${task.options.maxResults} results.`;
    }

    const response = query({
      prompt: instruction,
      options: {
        customSystemPrompt: SEARCH_WORKER_PROMPT,
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
        sessionId: `search_worker_${Date.now()}`,
        agentId: "search-worker",
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
  static async run(task: SearchTask): Promise<AgentResult> {
    const worker = new SearchWorker(task);
    return worker.execute();
  }
}
