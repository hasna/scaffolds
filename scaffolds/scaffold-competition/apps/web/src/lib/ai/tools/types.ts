export interface ToolContext {
  userId: string;
  tenantId: string;
  resumeId?: string;
  threadId?: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  streamContent?: string;
}

export type ToolExecutor<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult<TOutput>>;

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ExecutedTool extends ToolCall {
  result: ToolResult;
  executionTime: number;
}

export interface ToolRegistration<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  executor: ToolExecutor<TInput, TOutput>;
}
