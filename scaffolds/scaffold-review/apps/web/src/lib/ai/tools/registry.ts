import type { ToolExecutor, ToolContext, ToolResult } from "./types";
import {
  resumeExecutors,
  sectionExecutors,
  scrapingExecutors,
  contentGenerationExecutors,
  jobMatchingExecutors,
  exportExecutors,
} from "./executors";

// Combine all executors into a single registry
export const toolExecutors: Record<string, ToolExecutor<any, any>> = {
  // Data Extraction
  ...scrapingExecutors,

  // Resume CRUD
  ...resumeExecutors,

  // Section Management
  ...sectionExecutors,

  // Content Generation
  ...contentGenerationExecutors,

  // Job Matching
  ...jobMatchingExecutors,

  // Export
  ...exportExecutors,
};

export function getExecutor(toolName: string): ToolExecutor<any, any> | undefined {
  return toolExecutors[toolName];
}

export function registerExecutor(toolName: string, executor: ToolExecutor<any, any>): void {
  toolExecutors[toolName] = executor;
}

export async function executeToolCall(
  toolName: string,
  input: unknown,
  context: ToolContext
): Promise<ToolResult> {
  const executor = getExecutor(toolName);

  if (!executor) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    const result = await executor(input, context);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}
