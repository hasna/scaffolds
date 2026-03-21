#!/usr/bin/env bun
/**
 * Claude Code Hook: Check Migrations
 *
 * BLOCKER: Checks if database migrations are up to date.
 * If migrations are pending, it tries to run them automatically.
 * If migrations fail, blocks and instructs AI to fix them.
 *
 * Uses Drizzle Kit for migration management.
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
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
    "/Users/hasna/Workspace/dev/hasnaxyz/scaffold/scaffolddev/scaffold-social",
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
      output({ decision: "approve", reason: "Failed to parse hook input." });
      process.exit(0);
    }

    const cwd = findProjectRoot(hookInput.cwd);

    // Check if this is a Drizzle project
    const drizzleConfigPath = join(cwd, "drizzle.config.ts");
    const packagesDrizzleConfig = join(cwd, "packages/database/drizzle.config.ts");

    const hasDrizzle = existsSync(drizzleConfigPath) || existsSync(packagesDrizzleConfig);

    if (!hasDrizzle) {
      // Not a Drizzle project or no config found - approve
      output({
        decision: "approve",
        reason: "No Drizzle config found. Skipping migration check.",
      });
      process.exit(0);
    }

    // Check for pending migrations by running drizzle-kit push --dry-run
    // or checking if schema has changed
    try {
      console.error("[check-migrations] Checking migration status...");

      // First, try to check if there are schema changes
      // We'll try to generate migrations to see if there are pending changes
      const checkResult = execSync("bunx drizzle-kit push --dry-run 2>&1 || true", {
        cwd,
        encoding: "utf-8",
        timeout: 60000, // 1 minute timeout
        maxBuffer: 5 * 1024 * 1024,
      });

      // Check if there are pending changes
      const hasPendingChanges =
        checkResult.includes("CREATE TABLE") ||
        checkResult.includes("ALTER TABLE") ||
        checkResult.includes("DROP TABLE") ||
        checkResult.includes("changes detected");

      if (hasPendingChanges) {
        console.error("[check-migrations] Pending schema changes detected. Attempting to push...");

        // Try to push the changes
        try {
          const pushResult = execSync("bunx drizzle-kit push 2>&1", {
            cwd,
            encoding: "utf-8",
            timeout: 120000, // 2 minute timeout
            maxBuffer: 5 * 1024 * 1024,
          });

          // Check if push was successful
          if (
            pushResult.includes("Changes applied") ||
            pushResult.includes("Done") ||
            pushResult.includes("success")
          ) {
            output({
              decision: "approve",
              reason: "Database migrations applied successfully!",
            });
            process.exit(0);
          }
        } catch (pushError: unknown) {
          const execError = pushError as { stdout?: string; stderr?: string };
          const errorOutput = (execError.stdout || "") + (execError.stderr || "");

          // Migration push failed
          const reason = `🚫 BLOCKED: Database migration failed!

Error output:
${errorOutput.slice(0, 500)}

⚠️ YOU MUST FIX THE MIGRATION ISSUE!
Check the schema files and database connection.
Run \`bunx drizzle-kit push\` to see full error and fix before stopping.`;

          output({
            decision: "block",
            reason: reason,
          });
          process.exit(0);
        }
      }

      // No pending changes - all good
      output({
        decision: "approve",
        reason: "Database schema is up to date!",
      });
      process.exit(0);
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      const errorOutput = (execError.stdout || "") + (execError.stderr || "");

      // Check if it's a connection error
      if (
        errorOutput.includes("ECONNREFUSED") ||
        errorOutput.includes("connection refused") ||
        (errorOutput.includes("database") && errorOutput.includes("does not exist"))
      ) {
        output({
          decision: "block",
          reason: `🚫 BLOCKED: Database connection failed!

${errorOutput.slice(0, 300)}

⚠️ Please ensure:
1. PostgreSQL is running
2. DATABASE_URL is correctly set in .env.local
3. Database exists (create with: createdb scaffold_saas)

Fix the database connection before stopping.`,
        });
        process.exit(0);
      }

      // Other drizzle-kit error - might just be no migrations needed
      console.error(`[check-migrations] Drizzle check output: ${errorOutput.slice(0, 200)}`);
      output({
        decision: "approve",
        reason: "Migration check completed (review any warnings above).",
      });
      process.exit(0);
    }
  } catch (error) {
    // On hook error, approve to avoid blocking the session
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[check-migrations] Hook error: ${errorMsg}`);
    output({
      decision: "approve",
      reason: `Hook error (approving to avoid blocking): ${errorMsg}`,
    });
    process.exit(0);
  }
}

main();
