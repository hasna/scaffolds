/**
 * Permission policy definitions
 */

export interface PermissionPolicy {
  name: string;
  description: string;
  rules: PermissionRule[];
}

export interface PermissionRule {
  tool: string | "*";
  action: "allow" | "deny" | "ask";
  conditions?: PermissionConditions;
  priority?: number; // Higher priority rules are evaluated first
}

export interface PermissionConditions {
  pathPatterns?: string[]; // Glob patterns, prefix with ! to negate
  commandPatterns?: string[]; // Command patterns, prefix with ! to negate
  urlPatterns?: string[]; // URL patterns for WebFetch
  timeRestriction?: {
    start: string; // HH:MM format
    end: string;
    timezone?: string;
  };
  rateLimit?: {
    calls: number;
    window: string; // e.g., "1m", "1h", "1d"
  };
  requireConfirmation?: boolean;
}

/**
 * Default permission policy
 */
export const defaultPolicy: PermissionPolicy = {
  name: "default",
  description: "Default permission policy for agents - balanced security and usability",
  rules: [
    // Allow read operations
    {
      tool: "Read",
      action: "allow",
      priority: 10,
    },
    {
      tool: "Glob",
      action: "allow",
      priority: 10,
    },
    {
      tool: "Grep",
      action: "allow",
      priority: 10,
    },

    // Block sensitive file reads
    {
      tool: "Read",
      action: "deny",
      priority: 20,
      conditions: {
        pathPatterns: ["**/.env*", "**/secrets/**", "**/.ssh/**", "**/credentials*"],
      },
    },

    // Ask for write operations outside safe paths
    {
      tool: "Write",
      action: "ask",
      priority: 10,
      conditions: {
        pathPatterns: ["!**/node_modules/**", "!**/.git/**"],
      },
    },
    {
      tool: "Edit",
      action: "ask",
      priority: 10,
      conditions: {
        pathPatterns: ["!**/node_modules/**", "!**/.git/**"],
      },
    },

    // Block writes to system paths
    {
      tool: "Write",
      action: "deny",
      priority: 20,
      conditions: {
        pathPatterns: ["/etc/**", "/usr/**", "/bin/**", "/sbin/**"],
      },
    },

    // Restrict bash commands
    {
      tool: "Bash",
      action: "ask",
      priority: 10,
      conditions: {
        commandPatterns: ["!rm -rf*", "!sudo*", "!chmod 777*", "!mkfs*"],
      },
    },

    // Block dangerous bash commands
    {
      tool: "Bash",
      action: "deny",
      priority: 20,
      conditions: {
        commandPatterns: [
          "rm -rf /",
          "rm -rf /*",
          ":(){:|:&};:",
          "dd if=/dev/zero",
        ],
      },
    },

    // WebFetch - allow with rate limiting
    {
      tool: "WebFetch",
      action: "allow",
      priority: 10,
      conditions: {
        rateLimit: { calls: 30, window: "1m" },
      },
    },

    // WebSearch - allow with rate limiting
    {
      tool: "WebSearch",
      action: "allow",
      priority: 10,
      conditions: {
        rateLimit: { calls: 20, window: "1m" },
      },
    },

    // Task (subagent) - ask before spawning
    {
      tool: "Task",
      action: "ask",
      priority: 10,
    },

    // Default: allow everything else
    {
      tool: "*",
      action: "allow",
      priority: 0,
    },
  ],
};

/**
 * Strict permission policy - maximum security
 */
export const strictPolicy: PermissionPolicy = {
  name: "strict",
  description: "Strict permission policy - all write operations require confirmation",
  rules: [
    // Read operations - ask for sensitive
    {
      tool: "Read",
      action: "allow",
      priority: 10,
      conditions: {
        pathPatterns: ["!**/.env*", "!**/secrets/**", "!**/.ssh/**"],
      },
    },
    {
      tool: "Read",
      action: "deny",
      priority: 20,
      conditions: {
        pathPatterns: ["**/.env*", "**/secrets/**", "**/.ssh/**"],
      },
    },

    // All writes require confirmation
    {
      tool: "Write",
      action: "ask",
      priority: 10,
    },
    {
      tool: "Edit",
      action: "ask",
      priority: 10,
    },

    // Bash always requires confirmation
    {
      tool: "Bash",
      action: "ask",
      priority: 10,
    },

    // Block dangerous commands entirely
    {
      tool: "Bash",
      action: "deny",
      priority: 20,
      conditions: {
        commandPatterns: ["sudo*", "rm -rf*", "chmod*", "chown*"],
      },
    },

    // Web operations require confirmation
    {
      tool: "WebFetch",
      action: "ask",
      priority: 10,
    },
    {
      tool: "WebSearch",
      action: "ask",
      priority: 10,
    },

    // Subagents require confirmation
    {
      tool: "Task",
      action: "ask",
      priority: 10,
    },

    // Read tools allowed
    {
      tool: "Glob",
      action: "allow",
      priority: 10,
    },
    {
      tool: "Grep",
      action: "allow",
      priority: 10,
    },

    // Default deny
    {
      tool: "*",
      action: "deny",
      priority: 0,
    },
  ],
};

/**
 * Permissive policy - minimal restrictions
 */
export const permissivePolicy: PermissionPolicy = {
  name: "permissive",
  description: "Permissive policy - most operations allowed without confirmation",
  rules: [
    // Block only truly dangerous operations
    {
      tool: "Bash",
      action: "deny",
      priority: 20,
      conditions: {
        commandPatterns: [
          "rm -rf /",
          "rm -rf /*",
          ":(){:|:&};:",
          "dd if=/dev/zero",
          "mkfs*",
        ],
      },
    },

    // Protect secrets
    {
      tool: "*",
      action: "deny",
      priority: 20,
      conditions: {
        pathPatterns: ["**/.ssh/id_*", "**/credentials.json"],
      },
    },

    // Everything else allowed
    {
      tool: "*",
      action: "allow",
      priority: 0,
    },
  ],
};

/**
 * Get a policy by name
 */
export function getPolicy(name: string): PermissionPolicy | undefined {
  switch (name) {
    case "default":
      return defaultPolicy;
    case "strict":
      return strictPolicy;
    case "permissive":
      return permissivePolicy;
    default:
      return undefined;
  }
}
