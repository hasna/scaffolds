/**
 * Unit tests for scaffold agent components
 */

import { runSuite, assert, assertEqual, assertDefined, TestSuite } from "./setup.js";

// Import components to test
import { mergeConfig, validateConfig, defaultConfig } from "../dist/core/config.js";
import { ToolRegistry, tool, textResult } from "../dist/tools/registry.js";
import { AgentEventBus } from "../dist/listeners/event-bus.js";
import { SkillLoader } from "../dist/skills/loader.js";
import { PermissionEvaluator } from "../dist/permissions/evaluator.js";
import { z } from "zod";

const configSuite: TestSuite = {
  name: "Configuration System",
  tests: [
    {
      name: "should have default config values",
      fn: async () => {
        assertDefined(defaultConfig, "defaultConfig should exist");
        assertEqual(defaultConfig.model, "claude-sonnet-4-5", "default model");
        assertEqual(defaultConfig.maxTurns, 50, "default maxTurns");
        assertEqual(defaultConfig.maxBudgetUsd, 10.0, "default maxBudgetUsd");
      },
    },
    {
      name: "should merge partial config with defaults",
      fn: async () => {
        const partial = { model: "claude-opus-4-5" as const, maxTurns: 100 };
        const merged = mergeConfig(partial);
        assertEqual(merged.model, "claude-opus-4-5", "merged model");
        assertEqual(merged.maxTurns, 100, "merged maxTurns");
        assertEqual(merged.maxBudgetUsd, 10.0, "default maxBudgetUsd preserved");
      },
    },
    {
      name: "should validate config and return no errors for valid config",
      fn: async () => {
        const config = mergeConfig({});
        const errors = validateConfig(config);
        assertEqual(errors.length, 0, "should have no validation errors");
      },
    },
    {
      name: "should return errors for invalid config",
      fn: async () => {
        const invalidConfig = mergeConfig({ maxTurns: -1, maxBudgetUsd: -5 });
        const errors = validateConfig(invalidConfig);
        assert(errors.length > 0, "should have validation errors");
      },
    },
  ],
};

const toolRegistrySuite: TestSuite = {
  name: "Tool Registry",
  tests: [
    {
      name: "should register and retrieve a tool",
      fn: async () => {
        const registry = new ToolRegistry();
        const testTool = tool(
          "test_tool",
          "A test tool",
          z.object({ input: z.string() }),
          async (args) => textResult(`Received: ${args.input}`)
        );

        registry.register(testTool);
        assert(registry.has("test_tool"), "tool should be registered");

        const retrieved = registry.get("test_tool");
        assertDefined(retrieved, "tool should be retrievable");
        assertEqual(retrieved.name, "test_tool", "tool name should match");
      },
    },
    {
      name: "should execute a registered tool",
      fn: async () => {
        const registry = new ToolRegistry();
        const echoTool = tool(
          "echo",
          "Echo input",
          z.object({ message: z.string() }),
          async (args) => textResult(args.message)
        );

        registry.register(echoTool);
        const result = await registry.execute("echo", { message: "Hello" });

        assert(!result.isError, "should not be an error");
        assertEqual(result.content[0].type, "text", "should return text");
        assertEqual(
          (result.content[0] as { type: "text"; text: string }).text,
          "Hello",
          "should echo message"
        );
      },
    },
    {
      name: "should return error for unknown tool",
      fn: async () => {
        const registry = new ToolRegistry();
        const result = await registry.execute("unknown", {});

        assert(result.isError === true, "should be an error");
      },
    },
    {
      name: "should unregister a tool",
      fn: async () => {
        const registry = new ToolRegistry();
        const testTool = tool(
          "removable",
          "Removable tool",
          z.object({}),
          async () => textResult("ok")
        );

        registry.register(testTool);
        assert(registry.has("removable"), "tool should exist");

        const removed = registry.unregister("removable");
        assert(removed, "should return true on removal");
        assert(!registry.has("removable"), "tool should be gone");
      },
    },
  ],
};

const eventBusSuite: TestSuite = {
  name: "Event Bus",
  tests: [
    {
      name: "should register and trigger listeners",
      fn: async () => {
        const bus = new AgentEventBus();
        let triggered = false;

        bus.register(
          {
            name: "test_listener",
            events: ["task_started"],
            handler: async () => {
              triggered = true;
            },
          },
          { enabled: true }
        );

        bus.emitEvent({
          type: "task_started",
          taskId: "test",
          prompt: "test prompt",
        } as any);

        // Give async handler time to execute
        await new Promise((resolve) => setTimeout(resolve, 10));

        assert(triggered, "listener should be triggered");
      },
    },
    {
      name: "should list registered listeners",
      fn: async () => {
        const bus = new AgentEventBus();

        bus.register({
          name: "listener_a",
          events: ["task_started"],
          handler: async () => {},
        });

        bus.register({
          name: "listener_b",
          events: ["task_completed"],
          handler: async () => {},
        });

        const names = bus.getListenerNames();
        assert(names.includes("listener_a"), "should include listener_a");
        assert(names.includes("listener_b"), "should include listener_b");
      },
    },
    {
      name: "should respect enabled flag",
      fn: async () => {
        const bus = new AgentEventBus();
        let triggered = false;

        bus.register(
          {
            name: "disabled_listener",
            events: ["task_started"],
            handler: async () => {
              triggered = true;
            },
          },
          { enabled: false }
        );

        bus.emitEvent({
          type: "task_started",
          taskId: "test",
          prompt: "test",
        } as any);

        await new Promise((resolve) => setTimeout(resolve, 10));

        assert(!triggered, "disabled listener should not trigger");
      },
    },
    {
      name: "should enable/disable listeners",
      fn: async () => {
        const bus = new AgentEventBus();
        let count = 0;

        bus.register(
          {
            name: "toggleable",
            events: ["task_started"],
            handler: async () => {
              count++;
            },
          },
          { enabled: true }
        );

        bus.emitEvent({ type: "task_started", taskId: "1", prompt: "" } as any);
        await new Promise((resolve) => setTimeout(resolve, 10));
        assertEqual(count, 1, "should trigger once");

        bus.setEnabled("toggleable", false);
        bus.emitEvent({ type: "task_started", taskId: "2", prompt: "" } as any);
        await new Promise((resolve) => setTimeout(resolve, 10));
        assertEqual(count, 1, "should not trigger when disabled");

        bus.setEnabled("toggleable", true);
        bus.emitEvent({ type: "task_started", taskId: "3", prompt: "" } as any);
        await new Promise((resolve) => setTimeout(resolve, 10));
        assertEqual(count, 2, "should trigger when re-enabled");
      },
    },
  ],
};

const skillLoaderSuite: TestSuite = {
  name: "Skill Loader",
  tests: [
    {
      name: "should initialize without errors",
      fn: async () => {
        const loader = new SkillLoader();
        assertDefined(loader, "loader should be created");
      },
    },
    {
      name: "should return empty array when no skills loaded",
      fn: async () => {
        const loader = new SkillLoader();
        const skills = loader.getAllSkills();
        assert(Array.isArray(skills), "should return array");
        assertEqual(skills.length, 0, "should be empty initially");
      },
    },
  ],
};

const permissionsSuite: TestSuite = {
  name: "Permissions System",
  tests: [
    {
      name: "should allow by default when no rules",
      fn: async () => {
        const evaluator = new PermissionEvaluator({
          name: "test",
          description: "Test policy",
          rules: [],
        });

        const result = await evaluator.evaluate("Read", { file_path: "/test" });
        assertEqual(result.action, "allow", "should allow by default");
      },
    },
    {
      name: "should apply deny rule",
      fn: async () => {
        const evaluator = new PermissionEvaluator({
          name: "test",
          description: "Test policy",
          rules: [
            {
              tool: "Write",
              action: "deny",
              conditions: {
                pathPatterns: ["*.env", "*.secret"],
              },
            },
          ],
        });

        const result = await evaluator.evaluate("Write", { file_path: "config.env" });
        assertEqual(result.action, "deny", "should deny .env files");
      },
    },
    {
      name: "should apply allow rule with patterns",
      fn: async () => {
        const evaluator = new PermissionEvaluator({
          name: "test",
          description: "Test policy",
          rules: [
            {
              tool: "Read",
              action: "allow",
              conditions: {
                pathPatterns: ["src/**/*.ts"],
              },
            },
          ],
        });

        const result = await evaluator.evaluate("Read", { file_path: "src/core/system.ts" });
        assertEqual(result.action, "allow", "should allow src ts files");
      },
    },
    {
      name: "should respect rule priority",
      fn: async () => {
        const evaluator = new PermissionEvaluator({
          name: "test",
          description: "Test policy",
          rules: [
            {
              tool: "*",
              action: "deny",
              priority: 1,
            },
            {
              tool: "Read",
              action: "allow",
              priority: 10,
            },
          ],
        });

        const readResult = await evaluator.evaluate("Read", {});
        assertEqual(readResult.action, "allow", "Read should be allowed (higher priority)");

        const writeResult = await evaluator.evaluate("Write", {});
        assertEqual(writeResult.action, "deny", "Write should be denied");
      },
    },
  ],
};

// Run all unit tests
async function main() {
  console.log("\n🧪 SCAFFOLD AGENT UNIT TESTS\n");

  const results = [];

  results.push(await runSuite(configSuite));
  results.push(await runSuite(toolRegistrySuite));
  results.push(await runSuite(eventBusSuite));
  results.push(await runSuite(skillLoaderSuite));
  results.push(await runSuite(permissionsSuite));

  const total = results.reduce((sum, r) => sum + r.total, 0);
  const passed = results.reduce((sum, r) => sum + r.passed, 0);
  const failed = results.reduce((sum, r) => sum + r.failed, 0);

  console.log("\n" + "=".repeat(50));
  console.log(`📊 TOTAL: ${passed}/${total} tests passed`);
  if (failed > 0) {
    console.log(`❌ ${failed} tests failed`);
    process.exit(1);
  } else {
    console.log("✅ All tests passed!");
  }
}

main().catch((error) => {
  console.error("Test runner failed:", error);
  process.exit(1);
});
