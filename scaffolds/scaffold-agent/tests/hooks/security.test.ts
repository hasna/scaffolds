/**
 * Tests for security validation hook
 */

import { describe, it, expect } from "vitest";
import { securityValidationHook } from "../../src/hooks/pre/security-validation.js";
import type { HookContext } from "../../src/hooks/types.js";

const mockContext: HookContext = {
  sessionId: "test-session",
  agentId: "test-agent",
  turnNumber: 1,
};

describe("securityValidationHook", () => {
  describe("bash commands", () => {
    it("should deny dangerous rm -rf / command", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Bash",
          tool_input: { command: "rm -rf /" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    });

    it("should deny fork bomb", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Bash",
          tool_input: { command: ":(){:|:&};:" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    });

    it("should ask for sudo commands", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Bash",
          tool_input: { command: "sudo apt update" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("ask");
    });

    it("should allow safe commands", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Bash",
          tool_input: { command: "ls -la" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    });
  });

  describe("file paths", () => {
    it("should ask for .env file access", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Read",
          tool_input: { file_path: "/app/.env" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("ask");
    });

    it("should ask for secrets directory access", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Read",
          tool_input: { file_path: "/app/secrets/api-key.txt" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("ask");
    });

    it("should allow normal file access", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "Read",
          tool_input: { file_path: "/app/src/index.ts" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    });
  });

  describe("web fetch", () => {
    it("should ask for localhost access", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "WebFetch",
          tool_input: { url: "http://localhost:3000/api" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("ask");
    });

    it("should ask for internal network access", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "WebFetch",
          tool_input: { url: "http://192.168.1.1/admin" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe("ask");
    });

    it("should allow external URL access", async () => {
      const result = await securityValidationHook(
        {
          tool_name: "WebFetch",
          tool_input: { url: "https://api.example.com/data" },
        },
        null,
        mockContext
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    });
  });
});
