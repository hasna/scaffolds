/**
 * Security validation pre-tool hook
 * Blocks dangerous commands and validates file access
 */

import type { HookInput, HookContext, HookOutput } from "../types.js";

const DANGEROUS_PATTERNS = [
  "rm -rf /",
  "rm -rf /*",
  "sudo rm",
  "> /dev/",
  "mkfs",
  "dd if=",
  ":(){:|:&};:", // Fork bomb
  "chmod -R 777 /",
  "wget | bash",
  "curl | sh",
  "eval $(",
];

const SENSITIVE_PATHS = [
  ".env",
  "credentials",
  "secrets",
  ".ssh",
  "private",
  ".aws",
  ".gcp",
  "id_rsa",
  "id_ed25519",
  ".netrc",
];

const RESTRICTED_COMMANDS = [
  "passwd",
  "useradd",
  "userdel",
  "groupadd",
  "chown -R",
  "iptables",
  "systemctl",
  "service",
];

export async function securityValidationHook(
  input: HookInput,
  _toolUseId: string | null,
  _context: HookContext
): Promise<HookOutput> {
  const { tool_name, tool_input } = input;

  // Bash command validation
  if (tool_name === "Bash") {
    const command = String(tool_input.command || "");

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (command.includes(pattern)) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: `Blocked dangerous command pattern: ${pattern}`,
          },
        };
      }
    }

    // Check for restricted commands
    for (const restricted of RESTRICTED_COMMANDS) {
      if (command.includes(restricted)) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: `Restricted command requires confirmation: ${restricted}`,
          },
        };
      }
    }

    // Check for sudo usage
    if (command.startsWith("sudo ") || command.includes(" sudo ")) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: "Command requires sudo privileges",
        },
      };
    }
  }

  // File path validation
  if (["Read", "Write", "Edit"].includes(tool_name)) {
    const filePath = String(tool_input.file_path || tool_input.path || "");

    for (const sensitive of SENSITIVE_PATHS) {
      if (filePath.toLowerCase().includes(sensitive.toLowerCase())) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: `Accessing potentially sensitive path: ${filePath}`,
          },
        };
      }
    }

    // Block writes outside allowed paths
    const allowedPaths = (process.env.ALLOWED_PATHS || "").split(",");
    if (allowedPaths.length > 0 && allowedPaths[0] !== "") {
      const isAllowed = allowedPaths.some((allowed) =>
        filePath.startsWith(allowed.trim())
      );
      if (!isAllowed && (tool_name === "Write" || tool_name === "Edit")) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: `Path not in allowed paths: ${filePath}`,
          },
        };
      }
    }
  }

  // WebFetch validation
  if (tool_name === "WebFetch") {
    const url = String(tool_input.url || "");

    // Block local network access
    const localPatterns = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "192.168.",
      "10.",
      "172.16.",
    ];

    for (const pattern of localPatterns) {
      if (url.includes(pattern)) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: `Local network access requires confirmation: ${url}`,
          },
        };
      }
    }
  }

  // Allow by default
  return {};
}
