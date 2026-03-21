/**
 * Tool registry for managing custom and built-in tools
 */

import { z } from "zod";
import type { ToolDefinition, ToolResult } from "../core/types.js";

export type AnyToolDefinition = ToolDefinition<z.ZodObject<z.ZodRawShape>>;

export class ToolRegistry {
  private tools: Map<string, AnyToolDefinition> = new Map();

  /**
   * Register a tool
   */
  register<T extends z.ZodObject<z.ZodRawShape>>(
    tool: ToolDefinition<T>
  ): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool as unknown as AnyToolDefinition);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): AnyToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): AnyToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool
   */
  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Tool "${name}" not found` }],
        isError: true,
      };
    }

    try {
      // Validate input
      const validated = tool.inputSchema.parse(args);
      return await tool.handler(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Tool execution failed: ${message}` }],
        isError: true,
      };
    }
  }
}

/**
 * Create a tool definition helper
 */
export function tool<T extends z.ZodObject<z.ZodRawShape>>(
  name: string,
  description: string,
  inputSchema: T,
  handler: (args: z.infer<T>) => Promise<ToolResult>
): ToolDefinition<T> {
  return {
    name,
    description,
    inputSchema,
    handler,
  };
}

/**
 * Helper to create text tool result
 */
export function textResult(text: string, isError = false): ToolResult {
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

/**
 * Helper to create JSON tool result
 */
export function jsonResult(
  data: unknown,
  isError = false
): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    isError,
  };
}

// Singleton registry
export const toolRegistry = new ToolRegistry();
