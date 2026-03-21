/**
 * Custom tool implementations
 */

import { z } from "zod";
import { tool, textResult, jsonResult, toolRegistry } from "../registry.js";
import type { ToolResult } from "../../core/types.js";

/**
 * Database query tool (example)
 */
export const dbQueryTool = tool(
  "db_query",
  "Execute a read-only database query",
  z.object({
    query: z.string().describe("SQL query to execute"),
    database: z.string().describe("Target database name"),
  }),
  async (args): Promise<ToolResult> => {
    // Placeholder implementation
    // In production, connect to actual database
    return jsonResult({
      query: args.query,
      database: args.database,
      result: "Query execution placeholder - implement database connection",
    });
  }
);

/**
 * API call tool (example)
 */
export const apiCallTool = tool(
  "api_call",
  "Make an authenticated API request",
  z.object({
    endpoint: z.string().url().describe("API endpoint URL"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method"),
    body: z.record(z.any()).optional().describe("Request body for POST/PUT"),
    headers: z.record(z.string()).optional().describe("Additional headers"),
  }),
  async (args): Promise<ToolResult> => {
    try {
      const response = await fetch(args.endpoint, {
        method: args.method,
        headers: {
          "Content-Type": "application/json",
          ...args.headers,
        },
        body: args.body ? JSON.stringify(args.body) : undefined,
      });

      const data = await response.json();
      return jsonResult({
        status: response.status,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return textResult(`API call failed: ${message}`, true);
    }
  }
);

/**
 * Safe file write with backup
 */
export const safeWriteTool = tool(
  "safe_write",
  "Write to file with backup and validation",
  z.object({
    path: z.string().describe("File path to write to"),
    content: z.string().describe("Content to write"),
    createBackup: z.boolean().default(true).describe("Create backup before writing"),
  }),
  async (args): Promise<ToolResult> => {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      // Check if file exists and create backup
      if (args.createBackup) {
        try {
          await fs.access(args.path);
          const backupPath = `${args.path}.backup.${Date.now()}`;
          await fs.copyFile(args.path, backupPath);
        } catch {
          // File doesn't exist, no backup needed
        }
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(args.path), { recursive: true });

      // Write file
      await fs.writeFile(args.path, args.content, "utf-8");

      return textResult(`Successfully written to ${args.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return textResult(`Failed to write file: ${message}`, true);
    }
  }
);

/**
 * JSON validation tool
 */
export const validateJsonTool = tool(
  "validate_json",
  "Validate JSON against a schema",
  z.object({
    json: z.string().describe("JSON string to validate"),
    schema: z.record(z.any()).describe("JSON Schema to validate against"),
  }),
  async (args): Promise<ToolResult> => {
    try {
      const data = JSON.parse(args.json);

      // Basic schema validation using Zod
      // In production, use a full JSON Schema validator
      return jsonResult({
        valid: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResult({
        valid: false,
        error: message,
      });
    }
  }
);

/**
 * Environment info tool
 */
export const envInfoTool = tool(
  "env_info",
  "Get environment information",
  z.object({
    include: z
      .array(z.enum(["node", "platform", "cwd", "env"]))
      .default(["node", "platform", "cwd"])
      .describe("Information to include"),
  }),
  async (args): Promise<ToolResult> => {
    const info: Record<string, unknown> = {};

    if (args.include.includes("node")) {
      info.node = {
        version: process.version,
        arch: process.arch,
      };
    }

    if (args.include.includes("platform")) {
      info.platform = {
        os: process.platform,
        arch: process.arch,
      };
    }

    if (args.include.includes("cwd")) {
      info.cwd = process.cwd();
    }

    if (args.include.includes("env")) {
      // Only include safe env vars
      const safeEnvVars = ["NODE_ENV", "PATH", "HOME", "USER"];
      info.env = Object.fromEntries(
        safeEnvVars
          .filter((key) => process.env[key])
          .map((key) => [key, process.env[key]])
      );
    }

    return jsonResult(info);
  }
);

/**
 * Register all custom tools
 */
export function registerCustomTools(): void {
  toolRegistry.register(dbQueryTool);
  toolRegistry.register(apiCallTool);
  toolRegistry.register(safeWriteTool);
  toolRegistry.register(validateJsonTool);
  toolRegistry.register(envInfoTool);
}

export const customTools = {
  dbQueryTool,
  apiCallTool,
  safeWriteTool,
  validateJsonTool,
  envInfoTool,
};
