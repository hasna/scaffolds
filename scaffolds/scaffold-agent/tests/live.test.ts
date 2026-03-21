/**
 * Live integration tests for scaffold agent
 * These tests make real API calls to Claude
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runSuite, assert, assertDefined, TestSuite, delay } from "./setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

// Verify API key is available
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not found in environment");
  console.error("   Please ensure .env file exists with valid API key");
  process.exit(1);
}

console.log("✅ ANTHROPIC_API_KEY found");

// Import the agent system
import { createSystem, AgentSystem } from "../dist/index.js";
import { agentConfig } from "../dist/config/agent.config.js";

let system: AgentSystem | null = null;

const systemSuite: TestSuite = {
  name: "Agent System (Live)",
  tests: [
    {
      name: "should create and initialize agent system",
      fn: async () => {
        system = await createSystem({
          ...agentConfig,
          maxTurns: 5, // Limit for tests
          maxBudgetUsd: 1.0, // Limit budget for tests
        });
        assertDefined(system, "system should be created");
      },
    },
    {
      name: "should get configuration",
      fn: async () => {
        assertDefined(system, "system should exist");
        const config = system.getConfig();
        assertDefined(config, "config should exist");
        assert(config.maxTurns === 5, "maxTurns should be 5");
      },
    },
    {
      name: "should execute simple calculation task",
      fn: async () => {
        assertDefined(system, "system should exist");

        const result = await system.execute(
          "What is 25 multiplied by 4? Just respond with the number."
        );

        assert(result.success, "task should succeed");
        assert(result.output.includes("100"), "should calculate correctly");
        assertDefined(result.metadata, "should have metadata");
        assert(result.metadata.turnsUsed > 0, "should track turns");
      },
    },
    {
      name: "should handle code explanation task",
      fn: async () => {
        assertDefined(system, "system should exist");

        const result = await system.execute(
          'Explain in one sentence what this TypeScript code does: `const sum = (a: number, b: number) => a + b;`'
        );

        assert(result.success, "task should succeed");
        assert(result.output.length > 20, "should provide explanation");
        // Check for keywords that indicate understanding
        const keywords = ["add", "sum", "number", "function", "return"];
        const hasKeyword = keywords.some((k) =>
          result.output.toLowerCase().includes(k)
        );
        assert(hasKeyword, "should explain the function");
      },
    },
  ],
};

const streamingSuite: TestSuite = {
  name: "Streaming Execution (Live)",
  tests: [
    {
      name: "should stream response tokens",
      fn: async () => {
        assertDefined(system, "system should exist");

        const chunks: string[] = [];
        const stream = system.executeStream("Count from 1 to 5, one number per line.");

        for await (const chunk of stream) {
          if (typeof chunk === "string") {
            chunks.push(chunk);
          }
        }

        assert(chunks.length > 0, "should receive chunks");
        const fullOutput = chunks.join("");
        assert(fullOutput.includes("1"), "should include 1");
        assert(fullOutput.includes("5"), "should include 5");
      },
    },
  ],
};

const eventBusLiveSuite: TestSuite = {
  name: "Event Bus Integration (Live)",
  tests: [
    {
      name: "should emit events during task execution",
      fn: async () => {
        assertDefined(system, "system should exist");

        const events: string[] = [];

        // Register listener
        system.eventBus.register(
          {
            name: "test_event_collector",
            events: ["task_started", "task_completed"],
            handler: async (event) => {
              events.push(event.type);
            },
          },
          { enabled: true }
        );

        await system.execute("Say hello.");

        // Wait for async events
        await delay(100);

        assert(events.includes("task_started"), "should emit task_started");
        assert(events.includes("task_completed"), "should emit task_completed");
      },
    },
  ],
};

const specialistsSuite: TestSuite = {
  name: "Specialist Agents (Live)",
  tests: [
    {
      name: "should use CodeSpecialist for code tasks",
      fn: async () => {
        const { CodeSpecialist } = await import(
          "../dist/agents/specialists/code-specialist.js"
        );

        const specialist = new CodeSpecialist();
        const result = await specialist.generate(
          "Write a simple TypeScript function that checks if a number is even. Just the function, no explanation."
        );

        assert(result.success, "should succeed");
        assert(
          result.output.includes("function") || result.output.includes("=>"),
          "should generate a function"
        );
        assert(
          result.output.includes("%") || result.output.includes("mod"),
          "should use modulo"
        );
      },
    },
    {
      name: "should use ResearchSpecialist for research tasks",
      fn: async () => {
        const { ResearchSpecialist } = await import(
          "../dist/agents/specialists/research-specialist.js"
        );

        const specialist = new ResearchSpecialist();
        const result = await specialist.research(
          "What is TypeScript in one paragraph?"
        );

        assert(result.success, "should succeed");
        assert(result.output.length > 50, "should provide detailed response");
        const keywords = ["JavaScript", "type", "compile", "Microsoft"];
        const hasKeyword = keywords.some((k) =>
          result.output.includes(k)
        );
        assert(hasKeyword, "should mention relevant concepts");
      },
    },
  ],
};

const workersSuite: TestSuite = {
  name: "Worker Agents (Live)",
  tests: [
    {
      name: "should execute SearchWorker for file search",
      fn: async () => {
        const { SearchWorker } = await import(
          "../dist/agents/workers/search-worker.js"
        );

        const result = await SearchWorker.run({
          type: "search",
          instruction: "Find TypeScript files in src directory",
          searchType: "files",
          pattern: "*.ts",
          path: "./src",
        });

        assert(result.success, "should succeed");
        // The worker should find TypeScript files
        assert(result.output.length > 0, "should have output");
      },
    },
    {
      name: "should execute TransformWorker for data transformation",
      fn: async () => {
        const { TransformWorker } = await import(
          "../dist/agents/workers/transform-worker.js"
        );

        const result = await TransformWorker.run({
          type: "transform",
          instruction: "Extract value field from JSON",
          transformationType: "json",
          input: '{"name": "test", "value": 42}',
          transformation: "Extract just the value field",
        });

        assert(result.success, "should succeed");
        assert(
          result.output.includes("42"),
          "should extract value"
        );
      },
    },
  ],
};

// Run all live tests
async function main() {
  console.log("\n🔴 SCAFFOLD AGENT LIVE TESTS\n");
  console.log("⚠️  These tests make real API calls and may incur costs\n");

  const results = [];

  try {
    results.push(await runSuite(systemSuite));
    results.push(await runSuite(streamingSuite));
    results.push(await runSuite(eventBusLiveSuite));
    results.push(await runSuite(specialistsSuite));
    results.push(await runSuite(workersSuite));
  } finally {
    // Cleanup
    if (system) {
      console.log("\n🧹 Cleaning up...");
      await system.shutdown();
    }
  }

  const total = results.reduce((sum, r) => sum + r.total, 0);
  const passed = results.reduce((sum, r) => sum + r.passed, 0);
  const failed = results.reduce((sum, r) => sum + r.failed, 0);

  console.log("\n" + "=".repeat(50));
  console.log(`📊 TOTAL: ${passed}/${total} tests passed`);
  if (failed > 0) {
    console.log(`❌ ${failed} tests failed`);
    process.exit(1);
  } else {
    console.log("✅ All live tests passed!");
  }
}

main().catch((error) => {
  console.error("Live test runner failed:", error);
  process.exit(1);
});
