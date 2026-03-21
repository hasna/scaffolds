#!/usr/bin/env bun
/**
 * Claude Code Hook: Check Git Status
 *
 * STOP HOOK (NON-BLOCKING): Checks if there are uncommitted changes.
 * If changes exist, spawns the git-commits sub-agent using Claude Code SDK
 * to create logical commits and push to GitHub.
 *
 * Uses @anthropic-ai/claude-code SDK for async agent execution.
 */

import { query } from "@anthropic-ai/claude-code";
import { execSync } from "child_process";
import { existsSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");

const LOGS_DIR = join(PROJECT_ROOT, ".implementation", "logs", "agents");

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

function ensureLogDir(): void {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[-:]/g, "").replace("T", "_").split(".")[0];
}

function log(logPath: string, message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    appendFileSync(logPath, line);
  } catch {
    // Ignore log errors
  }
}

function findProjectRoot(inputCwd?: string): string {
  const possiblePaths = [
    inputCwd,
    PROJECT_ROOT,
    "/Users/hasna/Workspace/dev/hasnaxyz/scaffold/scaffolddev/scaffold-competition",
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (existsSync(join(p, ".git"))) {
      return p;
    }
  }
  return PROJECT_ROOT;
}

function getGitStatus(cwd: string): {
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
} {
  try {
    const status = execSync("git status --porcelain 2>/dev/null || true", {
      cwd,
      encoding: "utf-8",
    }).trim();

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    if (status) {
      const lines = status.split("\n").filter(Boolean);
      for (const line of lines) {
        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const file = line.slice(3);

        if (indexStatus === "?" && workTreeStatus === "?") {
          untracked.push(file);
        } else if (indexStatus !== " " && indexStatus !== "?") {
          staged.push(file);
        }
        if (workTreeStatus !== " " && workTreeStatus !== "?") {
          unstaged.push(file);
        }
      }
    }

    let ahead = 0;
    try {
      const tracking = execSync(
        "git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo '0 0'",
        { cwd, encoding: "utf-8" }
      ).trim();
      const [a] = tracking.split(/\s+/).map(Number);
      ahead = a || 0;
    } catch {
      // No upstream
    }

    return {
      hasChanges: staged.length > 0 || unstaged.length > 0 || untracked.length > 0,
      staged,
      unstaged,
      untracked,
      ahead,
    };
  } catch {
    return { hasChanges: false, staged: [], unstaged: [], untracked: [], ahead: 0 };
  }
}

async function runGitCommitsAgent(
  sessionId: string,
  cwd: string,
  status: { staged: string[]; unstaged: string[]; untracked: string[] },
  logPath: string
): Promise<void> {
  const allFiles = [...status.staged, ...status.unstaged, ...status.untracked];
  const filesList = allFiles.slice(0, 20).join("\n- ");
  const moreFiles = allFiles.length > 20 ? `\n- ... and ${allFiles.length - 20} more files` : "";

  log(logPath, "=".repeat(60));
  log(logPath, "GIT-COMMITS AGENT STARTING (Claude Code SDK)");
  log(logPath, `Session ID: ${sessionId}`);
  log(logPath, `Working Directory: ${cwd}`);
  log(logPath, `Total Files: ${allFiles.length}`);
  log(logPath, `Staged: ${status.staged.length}, Modified: ${status.unstaged.length}, Untracked: ${status.untracked.length}`);
  log(logPath, "=".repeat(60));

  const prompt = `You are the git-commits agent. Create logical, atomic git commits from all uncommitted changes and push to GitHub.

## Current Status
- Staged: ${status.staged.length}, Modified: ${status.unstaged.length}, Untracked: ${status.untracked.length}

## Files
- ${filesList}${moreFiles}

## Instructions
1. Run \`git status\` and \`git diff --stat\` to analyze changes
2. Group related changes by feature/domain (billing, auth, api, ui, hooks, agents, etc.)
3. Create atomic commits with conventional format (feat, fix, chore, docs, refactor, test)
4. Always include footer: 🤖 Generated with [Claude Code] + Co-Authored-By: Claude
5. Check remote with \`git remote -v\`, create PRIVATE repo if needed: \`gh repo create hasnaxyz/scaffold-competition --private --source=. --remote=origin\`
6. Push to GitHub: \`git push -u origin main\`

## Safety: NEVER force push, NEVER create PUBLIC repos, NEVER commit .env/secrets

Start with \`git status\` then create logical commits.`;

  try {
    log(logPath, "Starting Claude Code SDK query...");

    for await (const message of query({
      prompt,
      options: {
        cwd,
        allowedTools: ["Bash", "Read", "Glob", "Grep"],
        permissionMode: "bypassPermissions",
        maxTurns: 50,
      },
    })) {
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if ("text" in block) {
            log(logPath, `[ASSISTANT] ${block.text}`);
          } else if ("name" in block) {
            log(logPath, `[TOOL] ${block.name}: ${JSON.stringify(block.input || {}).slice(0, 200)}`);
          }
        }
      } else if (message.type === "result") {
        log(logPath, `[RESULT] ${message.subtype}: ${message.result || ""}`);
        if (message.total_cost_usd) {
          log(logPath, `[COST] $${message.total_cost_usd.toFixed(4)}`);
        }
      }
    }

    log(logPath, "=".repeat(60));
    log(logPath, "GIT-COMMITS AGENT COMPLETED");
    log(logPath, "=".repeat(60));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log(logPath, `[ERROR] Agent failed: ${errorMsg}`);
  }
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    let hookInput: HookInput;

    try {
      hookInput = JSON.parse(input);
    } catch {
      output({ decision: "approve" });
      process.exit(0);
    }

    // ALWAYS approve immediately (non-blocking)
    output({ decision: "approve" });

    const cwd = findProjectRoot(hookInput.cwd);

    if (!existsSync(join(cwd, ".git"))) {
      process.exit(0);
    }

    const status = getGitStatus(cwd);

    if (status.hasChanges || status.ahead > 0) {
      ensureLogDir();
      const timestamp = formatTimestamp();
      const shortSessionId = (hookInput.session_id || "unknown").slice(0, 8);
      const logPath = join(LOGS_DIR, `git-commits_${timestamp}_${shortSessionId}.log`);

      console.error(`[check-git] Uncommitted changes detected. Running git-commits agent via SDK...`);
      console.error(`[check-git] Log file: ${logPath}`);

      // Run async (fire and forget)
      runGitCommitsAgent(hookInput.session_id || "unknown", cwd, status, logPath).catch((err) => {
        log(logPath, `[ERROR] ${err.message}`);
      });
    }

    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[check-git] Hook error: ${errorMsg}`);
    output({ decision: "approve" });
    process.exit(0);
  }
}

main();
