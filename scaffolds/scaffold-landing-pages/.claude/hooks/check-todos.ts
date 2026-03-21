#!/usr/bin/env bun
/**
 * Claude Code Hook: Check TODOS.md
 *
 * INFO ONLY: Reports progress on TODOS.md but does NOT block.
 * TODOS.md contains the project roadmap which is long-term work.
 * Blocking on the full roadmap is not practical for session management.
 */

import { readFileSync, existsSync } from "fs";
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

function countTodos(content: string): { complete: number; incomplete: number } {
  const lines = content.split("\n");
  let complete = 0;
  let incomplete = 0;

  for (const line of lines) {
    // Match checkboxes at start of line (with potential leading whitespace)
    if (line.match(/^\s*- \[[xX]\]/)) {
      complete++;
    } else if (line.match(/^\s*- \[ \]/)) {
      incomplete++;
    }
  }

  return { complete, incomplete };
}

function output(result: HookOutput): void {
  const json = JSON.stringify(result);
  // Write to stdout synchronously
  process.stdout.write(json + "\n");
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    let hookInput: HookInput;

    try {
      hookInput = JSON.parse(input);
    } catch {
      // If we can't parse input, approve (don't block on hook errors)
      output({ decision: "approve", reason: "Hook input parse error - approving." });
      process.exit(0);
    }

    // Try multiple locations for TODOS.md
    const possiblePaths = [
      join(hookInput.cwd, "TODOS.md"),
      join(PROJECT_ROOT, "TODOS.md"),
      "/Users/hasna/Workspace/dev/hasnaxyz/scaffold/scaffolddev/scaffold-landing-pages/TODOS.md",
    ];

    let todosPath = "";
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        todosPath = p;
        break;
      }
    }

    if (!todosPath) {
      // No TODOS.md file - approve (it's optional)
      output({ decision: "approve", reason: "No TODOS.md found - OK" });
      process.exit(0);
    }

    const content = readFileSync(todosPath, "utf-8");
    const { complete, incomplete } = countTodos(content);
    const total = complete + incomplete;

    if (total === 0) {
      output({ decision: "approve", reason: "No todos in TODOS.md" });
      process.exit(0);
    }

    const percent = Math.round((complete / total) * 100);

    // Always approve - TODOS.md is project roadmap, not session blocker
    output({
      decision: "approve",
      reason: `📊 Project progress: ${complete}/${total} todos (${percent}% complete)`,
    });
    process.exit(0);
  } catch (error) {
    // On ANY error, approve (don't block on hook errors)
    output({ decision: "approve", reason: "Hook error - approving" });
    process.exit(0);
  }
}

main();
