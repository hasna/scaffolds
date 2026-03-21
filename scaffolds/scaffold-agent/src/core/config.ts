/**
 * Configuration management for the agent system
 */

import { config as dotenvConfig } from "dotenv";
import type { AgentConfig, ModelName, PermissionMode } from "./types.js";

// Load environment variables
dotenvConfig();

/**
 * Default agent configuration
 */
export const defaultConfig: AgentConfig = {
  model: (process.env.CLAUDE_MODEL as ModelName) || "claude-sonnet-4-5",
  maxTurns: parseInt(process.env.MAX_TURNS || "50", 10),
  maxBudgetUsd: parseFloat(process.env.MAX_BUDGET_USD || "10.0"),
  permissionMode: "default",
  permissionPolicy: "default",

  tools: {
    builtin: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch"],
    custom: [],
  },

  hooks: {
    enableSecurityValidation: true,
    enableTelemetry: true,
    enableRateLimit: true,
  },

  skills: {
    directory: "./src/skills",
    autoLoad: true,
  },

  listeners: {
    progress: {
      enabled: true,
      wsUrl: `ws://localhost:${process.env.WS_PORT || "3001"}`,
    },
    budget: {
      enabled: true,
      limit: parseFloat(process.env.MAX_BUDGET_USD || "10.0"),
    },
  },

  agents: {
    orchestrator: {
      enabled: true,
      maxDelegationDepth: 3,
    },
    specialists: ["code", "research", "data", "security"],
    workers: {
      maxConcurrent: 5,
      timeout: 30000,
    },
  },
};

/**
 * Merge configuration with defaults
 */
export function mergeConfig(
  partial: Partial<AgentConfig>
): AgentConfig {
  return {
    ...defaultConfig,
    ...partial,
    tools: {
      ...defaultConfig.tools,
      ...partial.tools,
    },
    hooks: {
      ...defaultConfig.hooks,
      ...partial.hooks,
    },
    skills: {
      ...defaultConfig.skills,
      ...partial.skills,
    },
    listeners: {
      ...defaultConfig.listeners,
      ...partial.listeners,
      progress: {
        ...defaultConfig.listeners.progress,
        ...partial.listeners?.progress,
      },
      budget: {
        ...defaultConfig.listeners.budget,
        ...partial.listeners?.budget,
      },
    },
    agents: {
      ...defaultConfig.agents,
      ...partial.agents,
      orchestrator: {
        ...defaultConfig.agents.orchestrator,
        ...partial.agents?.orchestrator,
      },
      workers: {
        ...defaultConfig.agents.workers,
        ...partial.agents?.workers,
      },
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: AgentConfig): string[] {
  const errors: string[] = [];

  if (config.maxTurns < 1) {
    errors.push("maxTurns must be at least 1");
  }

  if (config.maxBudgetUsd <= 0) {
    errors.push("maxBudgetUsd must be positive");
  }

  const validModels: ModelName[] = [
    "claude-sonnet-4-5",
    "claude-opus-4-5",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
  ];
  if (!validModels.includes(config.model)) {
    errors.push(`Invalid model: ${config.model}`);
  }

  const validModes: PermissionMode[] = [
    "default",
    "acceptEdits",
    "bypassPermissions",
    "plan",
  ];
  if (!validModes.includes(config.permissionMode)) {
    errors.push(`Invalid permissionMode: ${config.permissionMode}`);
  }

  if (config.agents.orchestrator.maxDelegationDepth < 1) {
    errors.push("maxDelegationDepth must be at least 1");
  }

  if (config.agents.workers.maxConcurrent < 1) {
    errors.push("workers.maxConcurrent must be at least 1");
  }

  if (config.agents.workers.timeout < 1000) {
    errors.push("workers.timeout must be at least 1000ms");
  }

  return errors;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): Partial<AgentConfig> {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return {
        hooks: {
          enableSecurityValidation: true,
          enableTelemetry: true,
          enableRateLimit: true,
        },
        permissionMode: "default",
      };

    case "test":
      return {
        maxTurns: 10,
        maxBudgetUsd: 1.0,
        hooks: {
          enableSecurityValidation: true,
          enableTelemetry: false,
          enableRateLimit: false,
        },
        listeners: {
          progress: { enabled: false },
          budget: { enabled: false, limit: 1.0 },
        },
      };

    case "development":
    default:
      return {
        hooks: {
          enableSecurityValidation: true,
          enableTelemetry: true,
          enableRateLimit: false,
        },
      };
  }
}
