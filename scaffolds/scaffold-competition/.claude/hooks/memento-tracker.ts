#!/usr/bin/env bun
/**
 * Claude Code Hook: Memento Tracker
 *
 * POST-TOOL HOOK (non-blocking) for Write/Edit operations.
 * Tracks file modifications and after 3+ writes, spawns a memento-writer
 * sub-agent using Claude Code SDK to create a detailed session memento.
 *
 * Uses @anthropic-ai/claude-code SDK for async agent execution.
 */

import { query } from "@anthropic-ai/claude-code";
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");

const STATE_DIR = join(PROJECT_ROOT, ".implementation", "data");
const MEMENTOS_DIR = join(PROJECT_ROOT, ".implementation", "data", "mementos");
const LOGS_DIR = join(PROJECT_ROOT, ".implementation", "logs", "agents");
const STATE_FILE = join(STATE_DIR, ".memento-state.json");

const WRITE_THRESHOLD = 3;

interface HookInput {
  session_id: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    new_string?: string;
  };
  tool_result?: { success?: boolean };
  cwd?: string;
}

interface HookOutput {
  decision: "approve" | "block";
  reason?: string;
}

interface MementoState {
  sessionId: string;
  startTime: string;
  writeCount: number;
  modifiedFiles: string[];
  lastMementoAt: string | null;
}

function output(result: HookOutput): void {
  const json = JSON.stringify(result);
  process.stdout.write(json + "\n");
}

function ensureDirectories(): void {
  [STATE_DIR, MEMENTOS_DIR, LOGS_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

function getState(sessionId: string): MementoState {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      if (data.sessionId === sessionId) {
        return data;
      }
    }
  } catch {
    // Ignore errors
  }
  return {
    sessionId,
    startTime: new Date().toISOString(),
    writeCount: 0,
    modifiedFiles: [],
    lastMementoAt: null,
  };
}

function saveState(state: MementoState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
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
    // Ignore
  }
}

async function runMementoWriterAgent(state: MementoState, logPath: string): Promise<void> {
  const timestamp = formatTimestamp();
  const filesList = state.modifiedFiles.join("\n- ");

  log(logPath, "=".repeat(60));
  log(logPath, "MEMENTO WRITER AGENT STARTING (Claude Code SDK)");
  log(logPath, `Session ID: ${state.sessionId}`);
  log(logPath, `Files Modified: ${state.writeCount}`);
  log(logPath, `Modified Files:\n- ${filesList}`);
  log(logPath, "=".repeat(60));

  const prompt = `You are the memento-writer agent. Create a detailed memento for this coding session.

## Session Information
- **Session ID:** ${state.sessionId}
- **Session Start:** ${state.startTime}
- **Files Modified:** ${state.writeCount}
- **Timestamp:** ${timestamp}

## Modified Files
${state.modifiedFiles.map((f) => `- ${f}`).join("\n")}

## Your Task

1. Run \`git diff --stat HEAD\` to see overall changes
2. For key modified files, run \`git diff HEAD -- "{file}"\` to see specific changes
3. Analyze the changes and understand what was accomplished
4. Create a comprehensive memento document with:
   - Summary of what was done
   - Per-file breakdown of changes
   - Technical details (dependencies, API, UI changes)
   - Code patterns used
   - Potential impact assessment
   - Recommended next steps

5. Generate a slug based on the primary activity (e.g., "api-billing-update", "hooks-sdk-migration")
6. Save the memento to: .implementation/data/mementos/memento_${timestamp}_{slug}.md

Be thorough and specific. Start by examining the git diff.`;

  try {
    log(logPath, "Starting Claude Code SDK query...");

    for await (const message of query({
      prompt,
      options: {
        cwd: PROJECT_ROOT,
        allowedTools: ["Bash", "Read", "Glob", "Grep", "Write"],
        permissionMode: "bypassPermissions",
        maxTurns: 30,
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
    log(logPath, "MEMENTO WRITER AGENT COMPLETED");
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

    // Always approve immediately (non-blocking)
    output({ decision: "approve" });

    const toolName = hookInput.tool_name?.toLowerCase() || "";
    if (!toolName.includes("write") && !toolName.includes("edit")) {
      process.exit(0);
    }

    const filePath = hookInput.tool_input?.file_path || "";
    if (!filePath) {
      process.exit(0);
    }

    // Skip internal files
    if (
      filePath.includes(".memento-state") ||
      filePath.includes("node_modules") ||
      filePath.includes(".git/")
    ) {
      process.exit(0);
    }

    ensureDirectories();

    const sessionId = hookInput.session_id || "unknown";
    const state = getState(sessionId);

    state.writeCount++;
    if (!state.modifiedFiles.includes(filePath)) {
      state.modifiedFiles.push(filePath);
    }

    const filesSinceLastMemento = state.lastMementoAt ? state.modifiedFiles.length : state.writeCount;

    if (filesSinceLastMemento >= WRITE_THRESHOLD) {
      const timestamp = formatTimestamp();
      const shortSessionId = sessionId.slice(0, 8);
      const logPath = join(LOGS_DIR, `memento-writer_${timestamp}_${shortSessionId}.log`);

      log(logPath, "Memento threshold reached!");
      log(logPath, `Write count: ${state.writeCount}`);
      log(logPath, `Unique files: ${state.modifiedFiles.length}`);

      // Run async (fire and forget)
      runMementoWriterAgent(state, logPath).catch((err) => {
        log(logPath, `[ERROR] ${err.message}`);
      });

      // Reset state for next batch
      state.lastMementoAt = new Date().toISOString();
      state.modifiedFiles = [];
      state.writeCount = 0;
    }

    saveState(state);
    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[memento-tracker] Error: ${errorMsg}`);
    output({ decision: "approve" });
    process.exit(0);
  }
}

main();
