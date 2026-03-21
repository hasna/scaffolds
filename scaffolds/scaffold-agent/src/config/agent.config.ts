/**
 * Agent configuration file
 */

import type { AgentConfig } from "../core/types.js";

export const agentConfig: AgentConfig = {
  // Model settings
  model: "claude-sonnet-4-5",
  maxTurns: 50,
  maxBudgetUsd: 10.0,

  // Permission settings
  permissionMode: "default",
  permissionPolicy: "default",

  // Tool settings
  tools: {
    builtin: [
      "Read",
      "Write",
      "Edit",
      "Bash",
      "Glob",
      "Grep",
      "WebSearch",
      "WebFetch",
    ],
    custom: ["db_query", "api_call", "safe_write", "validate_json", "env_info"],
  },

  // Hooks
  hooks: {
    enableSecurityValidation: true,
    enableTelemetry: true,
    enableRateLimit: true,
  },

  // Skills
  skills: {
    directory: "./src/skills",
    autoLoad: true,
  },

  // Listeners
  listeners: {
    progress: {
      enabled: true,
      wsUrl: "ws://localhost:3001",
    },
    budget: {
      enabled: true,
      limit: 10.0,
    },
  },

  // Agent hierarchy
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

export default agentConfig;
