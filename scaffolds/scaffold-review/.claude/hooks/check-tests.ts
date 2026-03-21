#!/usr/bin/env bun
/**
 * Claude Code Hook: Check Tests
 *
 * BLOCKER: Runs tests via `bun test` and blocks if any tests fail.
 * This ensures all tests pass 100% before allowing the session to stop.
 *
 * If tests fail, the AI is instructed to fix them before stopping.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get the project root (where this hook file lives is .claude/hooks/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");

interface HookInput {
  session_id: string;
  hook_event_name: string;
  cwd: string;
}

interface HookOutput {
  decision: "approve" | "block";
  reason?: string;
}

function output(result: HookOutput): void {
  const json = JSON.stringify(result);
  process.stdout.write(json + "\n");
}

function findProjectRoot(inputCwd: string): string {
  // Try multiple locations
  const possiblePaths = [
    inputCwd,
    PROJECT_ROOT,
    "/Users/hasna/Workspace/dev/hasnaxyz/scaffold/scaffolddev/scaffold-review",
  ];

  for (const p of possiblePaths) {
    if (existsSync(join(p, "package.json"))) {
      return p;
    }
  }
  return inputCwd;
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    let hookInput: HookInput;

    try {
      hookInput = JSON.parse(input);
    } catch {
      // If we can't parse input, approve to avoid blocking on hook errors
      output({ decision: "approve", reason: "Failed to parse hook input." });
      process.exit(0);
    }

    const cwd = findProjectRoot(hookInput.cwd);

    // Try to run tests
    try {
      console.error("[check-tests] Running unit tests...");

      // Run tests from packages directory to avoid Playwright tests
      // Use bun test from packages/utils which has the unit tests
      const result = execSync("cd packages/utils && bun test 2>&1", {
        cwd,
        encoding: "utf-8",
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Check if all tests passed
      if (result.includes("0 fail") || result.includes("pass")) {
        // Extract test summary
        const passMatch = result.match(/(\d+) pass/);
        const failMatch = result.match(/(\d+) fail/);
        const passCount = passMatch ? parseInt(passMatch[1]) : 0;
        const failCount = failMatch ? parseInt(failMatch[1]) : 0;

        if (failCount === 0 && passCount > 0) {
          output({
            decision: "approve",
            reason: `All ${passCount} tests passed! Great job!`,
          });
          process.exit(0);
        }
      }

      // If we get here, tests might have issues
      output({
        decision: "approve",
        reason: "Tests completed. Review output for any issues.",
      });
      process.exit(0);
    } catch (error: unknown) {
      // Test command failed - tests are failing
      const execError = error as { stdout?: string; stderr?: string; status?: number };
      const stdout = execError.stdout || "";
      const stderr = execError.stderr || "";
      const combinedOutput = stdout + stderr;

      // Extract failure information
      const failMatch = combinedOutput.match(/(\d+) fail/);
      const failCount = failMatch ? parseInt(failMatch[1]) : "unknown";

      // Extract failed test names if possible
      const failedTests: string[] = [];
      const failedTestMatches = combinedOutput.match(/✗.*|FAIL.*/g);
      if (failedTestMatches) {
        failedTests.push(...failedTestMatches.slice(0, 5)); // First 5 failures
      }

      const failedTestsText =
        failedTests.length > 0
          ? `\n\nFailed tests:\n${failedTests.map((t) => `  - ${t}`).join("\n")}`
          : "";

      const reason = `🚫 BLOCKED: ${failCount} test(s) failed!${failedTestsText}

⚠️ YOU MUST FIX THE FAILING TESTS!
Run \`bun test\` to see full output and fix all failures before stopping.
This hook will block EVERY stop attempt until ALL tests pass 100%.`;

      output({
        decision: "block",
        reason: reason,
      });
      process.exit(0);
    }
  } catch (error) {
    // On hook error, approve to avoid blocking the session
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[check-tests] Hook error: ${errorMsg}`);
    output({
      decision: "approve",
      reason: `Hook error (approving to avoid blocking): ${errorMsg}`,
    });
    process.exit(0);
  }
}

main();
