import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const MCP_NAME = "open-scaffolds";
const MCP_COMMAND = "scaffolds-mcp";

// ─── Claude ───────────────────────────────────────────────────────────────────

export async function registerClaude(): Promise<void> {
  const proc = Bun.spawn(
    [
      "claude",
      "mcp",
      "add",
      "--transport",
      "stdio",
      "--scope",
      "user",
      MCP_NAME,
      "--",
      MCP_COMMAND,
    ],
    { stdout: "pipe", stderr: "pipe" }
  );

  const [exitCode, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `claude mcp add failed (exit ${exitCode}): ${stderr.trim()}`
    );
  }
}

export async function unregisterClaude(): Promise<void> {
  const proc = Bun.spawn(["claude", "mcp", "remove", MCP_NAME], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `claude mcp remove failed (exit ${exitCode}): ${stderr.trim()}`
    );
  }
}

// ─── Codex ────────────────────────────────────────────────────────────────────

function codexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

export async function registerCodex(): Promise<void> {
  const configPath = codexConfigPath();
  const dir = join(homedir(), ".codex");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let content = existsSync(configPath)
    ? readFileSync(configPath, "utf8")
    : "";

  const entry = `\n[mcp_servers.${MCP_NAME}]\ncommand = "${MCP_COMMAND}"\n`;

  if (content.includes(`[mcp_servers.${MCP_NAME}]`)) {
    // Already registered — no-op
    return;
  }

  writeFileSync(configPath, content + entry, "utf8");
}

export async function unregisterCodex(): Promise<void> {
  const configPath = codexConfigPath();

  if (!existsSync(configPath)) {
    return;
  }

  const content = readFileSync(configPath, "utf8");

  // Remove the [mcp_servers.<name>] block (header + all keys until next section or EOF)
  const blockRegex = new RegExp(
    `\\n?\\[mcp_servers\\.${MCP_NAME}\\][^\\[]*`,
    "g"
  );
  const updated = content.replace(blockRegex, "");

  writeFileSync(configPath, updated, "utf8");
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

function geminiConfigPath(): string {
  return join(homedir(), ".gemini", "settings.json");
}

export async function registerGemini(): Promise<void> {
  const configPath = geminiConfigPath();
  const dir = join(homedir(), ".gemini");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let config: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf8"));
    } catch {
      config = {};
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }

  const servers = config.mcpServers as Record<string, unknown>;

  if (servers[MCP_NAME]) {
    // Already registered — no-op
    return;
  }

  servers[MCP_NAME] = { command: MCP_COMMAND, args: [] };

  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function unregisterGemini(): Promise<void> {
  const configPath = geminiConfigPath();

  if (!existsSync(configPath)) {
    return;
  }

  let config: Record<string, unknown> = {};

  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return;
  }

  if (
    config.mcpServers &&
    typeof config.mcpServers === "object" &&
    (config.mcpServers as Record<string, unknown>)[MCP_NAME]
  ) {
    delete (config.mcpServers as Record<string, unknown>)[MCP_NAME];
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  }
}
