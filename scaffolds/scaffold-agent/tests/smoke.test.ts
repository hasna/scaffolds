/**
 * Quick smoke test to verify basic functionality
 * This is a minimal test that runs quickly
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

async function smokeTest() {
  console.log("🚬 Smoke Test - Scaffold Agent\n");

  // Check environment
  console.log("1. Checking environment...");
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not found");
  }
  console.log("   ✅ API key found");

  // Check imports
  console.log("2. Checking imports...");
  const { createSystem } = await import("../dist/index.js");
  const { agentConfig } = await import("../dist/config/agent.config.js");
  console.log("   ✅ Imports successful");

  // Create system
  console.log("3. Creating agent system...");
  const system = await createSystem({
    ...agentConfig,
    maxTurns: 3,
    maxBudgetUsd: 0.50,
  });
  console.log("   ✅ System created");

  // Execute simple task
  console.log("4. Executing test task...");
  const start = Date.now();
  const result = await system.execute(
    "Respond with exactly: SMOKE_TEST_OK"
  );
  const duration = Date.now() - start;

  if (!result.success) {
    throw new Error(`Task failed: ${result.error?.message}`);
  }

  if (!result.output.includes("SMOKE_TEST_OK")) {
    throw new Error(`Unexpected output: ${result.output}`);
  }

  console.log(`   ✅ Task completed in ${duration}ms`);
  console.log(`   Response: ${result.output.substring(0, 100)}`);

  // Check metadata
  console.log("5. Checking metadata...");
  console.log(`   Turns used: ${result.metadata.turnsUsed}`);
  console.log(`   Cost: $${result.metadata.costUsd.toFixed(4)}`);
  console.log(`   Duration: ${result.metadata.duration}ms`);
  console.log("   ✅ Metadata present");

  // Cleanup
  console.log("6. Shutting down...");
  await system.shutdown();
  console.log("   ✅ Shutdown complete");

  console.log("\n" + "=".repeat(50));
  console.log("🎉 SMOKE TEST PASSED!");
  console.log("=".repeat(50));
}

smokeTest().catch((error) => {
  console.error("\n❌ SMOKE TEST FAILED!");
  console.error(`   Error: ${error.message}`);
  process.exit(1);
});
