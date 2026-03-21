/**
 * Tests for permission evaluator
 */

import { describe, it, expect } from "vitest";
import { PermissionEvaluator } from "../../src/permissions/evaluator.js";
import { defaultPolicy, strictPolicy, permissivePolicy } from "../../src/permissions/policy.js";

describe("PermissionEvaluator", () => {
  describe("default policy", () => {
    const evaluator = new PermissionEvaluator(defaultPolicy);

    it("should allow Read by default", async () => {
      const result = await evaluator.evaluate("Read", {
        file_path: "/app/src/index.ts",
      });
      expect(result.action).toBe("allow");
    });

    it("should allow Glob by default", async () => {
      const result = await evaluator.evaluate("Glob", {
        pattern: "**/*.ts",
      });
      expect(result.action).toBe("allow");
    });

    it("should ask for Write operations", async () => {
      const result = await evaluator.evaluate("Write", {
        file_path: "/app/src/new-file.ts",
      });
      expect(result.action).toBe("ask");
    });

    it("should deny writes to system paths", async () => {
      const result = await evaluator.evaluate("Write", {
        file_path: "/etc/passwd",
      });
      expect(result.action).toBe("deny");
    });

    it("should deny dangerous bash commands", async () => {
      const result = await evaluator.evaluate("Bash", {
        command: "rm -rf /",
      });
      expect(result.action).toBe("deny");
    });
  });

  describe("strict policy", () => {
    const evaluator = new PermissionEvaluator(strictPolicy);

    it("should deny .env file reads", async () => {
      const result = await evaluator.evaluate("Read", {
        file_path: "/app/.env",
      });
      expect(result.action).toBe("deny");
    });

    it("should ask for all Write operations", async () => {
      const result = await evaluator.evaluate("Write", {
        file_path: "/app/test.txt",
      });
      expect(result.action).toBe("ask");
    });

    it("should deny sudo commands", async () => {
      const result = await evaluator.evaluate("Bash", {
        command: "sudo apt update",
      });
      expect(result.action).toBe("deny");
    });
  });

  describe("permissive policy", () => {
    const evaluator = new PermissionEvaluator(permissivePolicy);

    it("should allow most operations", async () => {
      const result = await evaluator.evaluate("Write", {
        file_path: "/app/src/new-file.ts",
      });
      expect(result.action).toBe("allow");
    });

    it("should still deny rm -rf /", async () => {
      const result = await evaluator.evaluate("Bash", {
        command: "rm -rf /",
      });
      expect(result.action).toBe("deny");
    });

    it("should deny SSH key access", async () => {
      const result = await evaluator.evaluate("Read", {
        file_path: "/home/user/.ssh/id_rsa",
      });
      expect(result.action).toBe("deny");
    });
  });

  describe("policy management", () => {
    it("should update policy", () => {
      const evaluator = new PermissionEvaluator(defaultPolicy);
      evaluator.setPolicy(strictPolicy);
      expect(evaluator.getPolicy().name).toBe("strict");
    });

    it("should add custom rules", async () => {
      const evaluator = new PermissionEvaluator(defaultPolicy);
      evaluator.addRule({
        tool: "CustomTool",
        action: "deny",
        priority: 100,
      });

      const result = await evaluator.evaluate("CustomTool", {});
      expect(result.action).toBe("deny");
    });
  });
});
