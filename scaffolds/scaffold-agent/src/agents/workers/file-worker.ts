/**
 * File Worker Agent
 * Handles atomic file operations
 */

import { query } from "@anthropic-ai/claude-code";
import { BaseWorker } from "./base-worker.js";
import type { WorkerTask } from "../types.js";
import type { AgentResult } from "../../core/types.js";

const FILE_WORKER_PROMPT = `You are a File Worker Agent. Execute file operations precisely and efficiently.

Available operations:
- Read: Read file contents
- Write: Create or overwrite files
- Edit: Modify specific parts of files

Guidelines:
1. Execute only the requested operation
2. Verify paths before operations
3. Report success or failure clearly
4. Do not make additional changes
`;

export interface FileTask extends WorkerTask {
  type: "file";
  operation: "read" | "write" | "edit";
  path: string;
  content?: string;
  oldContent?: string;
}

export class FileWorker extends BaseWorker {
  constructor(task: FileTask) {
    super({
      task,
      systemPrompt: FILE_WORKER_PROMPT,
      maxTurns: 3,
    });
  }

  protected async doExecute(): Promise<AgentResult> {
    const task = this.config.task as FileTask;

    let instruction = "";
    switch (task.operation) {
      case "read":
        instruction = `Read the file at: ${task.path}`;
        break;
      case "write":
        instruction = `Write to file ${task.path} with content:\n${task.content}`;
        break;
      case "edit":
        instruction = `Edit file ${task.path}. Replace:\n${task.oldContent}\nWith:\n${task.content}`;
        break;
    }

    const response = query({
      prompt: instruction,
      options: {
        customSystemPrompt: FILE_WORKER_PROMPT,
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
        sessionId: `file_worker_${Date.now()}`,
        agentId: "file-worker",
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
  static async run(task: FileTask): Promise<AgentResult> {
    const worker = new FileWorker(task);
    return worker.execute();
  }
}
