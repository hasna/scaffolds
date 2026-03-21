#!/usr/bin/env node

/**
 * CLI entry point for the scaffold agent
 */

import { createSystem } from "./index.js";
import { agentConfig } from "./config/agent.config.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "run":
      await runTask(args.slice(1).join(" "));
      break;

    case "analyze":
      await analyze(args.slice(1).join(" "));
      break;

    case "security":
      await securityScan(args.slice(1).join(" "));
      break;

    case "help":
    default:
      printHelp();
      break;
  }
}

async function runTask(task: string) {
  if (!task) {
    console.error("Error: No task provided");
    console.log("Usage: scaffold-agent run <task>");
    process.exit(1);
  }

  console.log("Initializing agent system...");
  const system = await createSystem(agentConfig);

  console.log(`Executing: ${task}`);
  const result = await system.execute(task);

  if (result.success) {
    console.log("\n--- Result ---");
    console.log(result.output);
    console.log("\n--- Metadata ---");
    console.log(`Duration: ${result.metadata.duration}ms`);
    console.log(`Turns used: ${result.metadata.turnsUsed}`);
  } else {
    console.error("Task failed:", result.error?.message);
    process.exit(1);
  }

  await system.shutdown();
}

async function analyze(target: string) {
  const { CodeSpecialist } = await import("./agents/specialists/code-specialist.js");

  if (!target) {
    target = ".";
  }

  console.log(`Analyzing: ${target}`);
  const specialist = new CodeSpecialist();
  const result = await specialist.analyze(target);

  console.log("\n--- Analysis Result ---");
  console.log(JSON.stringify(result, null, 2));
}

async function securityScan(target: string) {
  const { SecuritySpecialist } = await import("./agents/specialists/security-specialist.js");

  if (!target) {
    target = ".";
  }

  console.log(`Scanning: ${target}`);
  const specialist = new SecuritySpecialist();
  const result = await specialist.audit(target);

  console.log("\n--- Security Scan Result ---");
  console.log(result.output);
}

function printHelp() {
  console.log(`
Scaffold Agent - Multi-layered Agentic System

Usage:
  scaffold-agent <command> [options]

Commands:
  run <task>        Execute a task using the agent system
  analyze [path]    Analyze code at the specified path
  security [path]   Run security scan on the specified path
  help              Show this help message

Examples:
  scaffold-agent run "Analyze src/ for security vulnerabilities"
  scaffold-agent analyze src/
  scaffold-agent security .

Environment:
  ANTHROPIC_API_KEY    Required. Your Anthropic API key.
  CLAUDE_MODEL         Optional. Model to use (default: claude-sonnet-4-5)
  MAX_TURNS            Optional. Maximum turns (default: 50)
  MAX_BUDGET_USD       Optional. Budget limit (default: 10.0)
`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
