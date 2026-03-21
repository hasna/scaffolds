#!/usr/bin/env bun
import React, { useState } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import { Command } from "commander";
import chalk from "chalk";
import {
  SCAFFOLDS,
  CATEGORIES,
  searchScaffolds,
  getScaffoldsByCategory,
  type ScaffoldMeta,
} from "../lib/registry.js";
import {
  installScaffold,
  getInstalledScaffolds,
  scaffoldExists,
  type InstallOptions,
} from "../lib/installer.js";
import {
  registerClaude,
  registerCodex,
  registerGemini,
  unregisterClaude,
  unregisterCodex,
  unregisterGemini,
} from "../lib/mcp-register.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allScaffolds(): ScaffoldMeta[] {
  return Object.values(SCAFFOLDS);
}

function printScaffoldTable(scaffolds: ScaffoldMeta[]) {
  if (scaffolds.length === 0) {
    console.log(chalk.yellow("No scaffolds found."));
    return;
  }
  const colId = 28;
  const colCat = 8;
  const colDesc = 55;

  const header =
    chalk.bold(chalk.cyan("NAME").padEnd(colId)) +
    chalk.bold(chalk.cyan("CAT").padEnd(colCat)) +
    chalk.bold(chalk.cyan("DESCRIPTION"));
  console.log(header);
  console.log(chalk.dim("─".repeat(colId + colCat + colDesc)));

  for (const s of scaffolds) {
    const desc =
      s.description.length > colDesc - 2
        ? s.description.slice(0, colDesc - 5) + "..."
        : s.description;
    console.log(
      chalk.green(s.id.padEnd(colId)) +
        chalk.dim(s.category.padEnd(colCat)) +
        desc
    );
  }
}

function printScaffoldInfo(s: ScaffoldMeta) {
  console.log();
  console.log(chalk.bold(chalk.cyan(s.name)));
  console.log(chalk.dim("─".repeat(50)));
  console.log(chalk.dim("ID:         ") + s.id);
  console.log(chalk.dim("Category:   ") + s.category);
  console.log(chalk.dim("Description:") + " " + s.description);
  console.log(
    chalk.dim("Tech Stack: ") + chalk.yellow(s.techStack.join(", "))
  );
  if (s.auth.length > 0) {
    console.log(chalk.dim("Auth:       ") + s.auth.join(", "));
  }
  if (s.sourceRepo) {
    console.log(
      chalk.dim("Source:     ") +
        chalk.blue(`https://github.com/${s.sourceRepo}`)
    );
  }
  console.log(chalk.dim("Tags:       ") + s.tags.map((t) => `#${t}`).join(" "));
  console.log();
}

// ─── TUI Components ──────────────────────────────────────────────────────────

interface DetailViewProps {
  scaffold: ScaffoldMeta;
  onBack: () => void;
  onInstall: (s: ScaffoldMeta) => void;
}

function DetailView({ scaffold: s, onBack, onInstall }: DetailViewProps) {
  const items = [
    { label: "Install this scaffold", value: "install" },
    { label: "Back to list", value: "back" },
  ];

  function handleSelect(item: { value: string }) {
    if (item.value === "install") {
      onInstall(s);
    } else {
      onBack();
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {s.name}
      </Text>
      <Text dimColor>{"─".repeat(50)}</Text>
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Text>
          <Text dimColor>Category:    </Text>
          <Text>{s.category}</Text>
        </Text>
        <Text>
          <Text dimColor>Description: </Text>
          <Text>{s.description}</Text>
        </Text>
        <Text>
          <Text dimColor>Tech Stack:  </Text>
          <Text color="yellow">{s.techStack.join(", ")}</Text>
        </Text>
        {s.auth.length > 0 && (
          <Text>
            <Text dimColor>Auth:        </Text>
            <Text>{s.auth.join(", ")}</Text>
          </Text>
        )}
        {s.sourceRepo && (
          <Text>
            <Text dimColor>Source:      </Text>
            <Text color="blue">https://github.com/{s.sourceRepo}</Text>
          </Text>
        )}
        <Text>
          <Text dimColor>Tags:        </Text>
          <Text dimColor>{s.tags.map((t) => `#${t}`).join(" ")}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}

interface InstallingViewProps {
  scaffold: ScaffoldMeta;
  onDone: () => void;
}

function InstallingView({ scaffold, onDone }: InstallingViewProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<
    "running" | "success" | "error"
  >("running");
  const [message, setMessage] = useState("");

  React.useEffect(() => {
    try {
      const result = installScaffold(scaffold.id, {});
      setStatus("success");
      setMessage(
        `Installed ${scaffold.id} → ${result.targetDir} (${result.filesWritten} files)`
      );
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [scaffold.id]);

  useInput((_, key) => {
    if (status !== "running" && (key.return || key.escape)) {
      onDone();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {status === "running" && (
        <Text>
          <Text color="yellow">Installing </Text>
          <Text color="cyan">{scaffold.id}</Text>
          <Text color="yellow">…</Text>
        </Text>
      )}
      {status === "success" && (
        <>
          <Text color="green">✓ {message}</Text>
          <Text dimColor>Press Enter to return to list.</Text>
        </>
      )}
      {status === "error" && (
        <>
          <Text color="red">✗ {message}</Text>
          <Text dimColor>Press Enter to return to list.</Text>
        </>
      )}
    </Box>
  );
}

interface ListViewProps {
  scaffolds: ScaffoldMeta[];
  onSelect: (s: ScaffoldMeta) => void;
}

function ListView({ scaffolds, onSelect }: ListViewProps) {
  const items = scaffolds.map((s) => ({
    label: `${chalk.green(s.id.padEnd(28))} ${chalk.dim(s.category.padEnd(6))} ${s.description.slice(0, 42)}${s.description.length > 42 ? "…" : ""}`,
    value: s.id,
  }));

  function handleSelect(item: { value: string }) {
    const found = scaffolds.find((s) => s.id === item.value);
    if (found) onSelect(found);
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Open Scaffolds
        </Text>
        <Text dimColor> — {scaffolds.length} scaffolds</Text>
      </Box>
      <Text dimColor>
        {chalk.bold("NAME".padEnd(28))} {chalk.bold("CAT".padEnd(6))}{" "}
        {chalk.bold("DESCRIPTION")}
      </Text>
      <Text dimColor>{"─".repeat(70)}</Text>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate  Enter select  Ctrl+C quit</Text>
      </Box>
    </Box>
  );
}

type TuiView =
  | { kind: "list" }
  | { kind: "detail"; scaffold: ScaffoldMeta }
  | { kind: "installing"; scaffold: ScaffoldMeta };

function TuiApp() {
  const scaffolds = allScaffolds();
  const [view, setView] = useState<TuiView>({ kind: "list" });

  if (view.kind === "list") {
    return (
      <ListView
        scaffolds={scaffolds}
        onSelect={(s) => setView({ kind: "detail", scaffold: s })}
      />
    );
  }

  if (view.kind === "detail") {
    return (
      <DetailView
        scaffold={view.scaffold}
        onBack={() => setView({ kind: "list" })}
        onInstall={(s) => setView({ kind: "installing", scaffold: s })}
      />
    );
  }

  if (view.kind === "installing") {
    return (
      <InstallingView
        scaffold={view.scaffold}
        onDone={() => setView({ kind: "list" })}
      />
    );
  }

  return null;
}

// ─── CLI Commands ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("scaffolds")
  .description("Open Scaffolds CLI — browse, search, and install app scaffolds")
  .version("0.0.1");

// Default: interactive TUI (no subcommand)
program
  .action(() => {
    render(<TuiApp />);
  });

program
  .command("list")
  .description("List all scaffolds or only installed ones")
  .option("--installed", "show only installed scaffolds in current project")
  .action((opts: { installed?: boolean }) => {
    if (opts.installed) {
      const installed = getInstalledScaffolds(process.cwd());
      if (installed.length === 0) {
        console.log(chalk.yellow("No scaffolds installed in this project."));
        return;
      }
      console.log(
        chalk.bold(chalk.cyan("ID".padEnd(28))) +
          chalk.bold(chalk.cyan("NAME".padEnd(24))) +
          chalk.bold(chalk.cyan("INSTALLED AT"))
      );
      console.log(chalk.dim("─".repeat(72)));
      for (const s of installed) {
        console.log(
          chalk.green(s.id.padEnd(28)) +
            s.name.padEnd(24) +
            chalk.dim(s.installedAt)
        );
      }
    } else {
      printScaffoldTable(allScaffolds());
    }
  });

program
  .command("search <query>")
  .description("Search scaffolds by name, description, or tags")
  .action((query: string) => {
    const results = searchScaffolds(query);
    if (results.length === 0) {
      console.log(chalk.yellow(`No scaffolds match "${query}".`));
      return;
    }
    console.log(
      chalk.dim(`Found ${results.length} result(s) for `) +
        chalk.cyan(`"${query}"`) +
        "\n"
    );
    printScaffoldTable(results);
  });

program
  .command("info <name>")
  .description("Show detailed info for a scaffold")
  .action((name: string) => {
    const normalized = name.startsWith("scaffold-") ? name : `scaffold-${name}`;
    const s = SCAFFOLDS[normalized] ?? SCAFFOLDS[name];
    if (!s) {
      console.error(chalk.red(`Scaffold "${name}" not found.`));
      console.log(
        chalk.dim(
          'Run "scaffolds list" to see available scaffolds.'
        )
      );
      process.exit(1);
    }
    printScaffoldInfo(s);
  });

program
  .command("install <name>")
  .description("Install a scaffold into a new directory")
  .option("--dir <path>", "target directory (default: cwd/<name>)")
  .option("--name <appname>", "application name (replaces {{name}} in templates)")
  .option(
    "--description <desc>",
    "application description (replaces {{description}} in templates)"
  )
  .action(
    async (
      name: string,
      opts: { dir?: string; name?: string; description?: string }
    ) => {
      const normalized = name.startsWith("scaffold-") ? name : `scaffold-${name}`;
      const s = SCAFFOLDS[normalized] ?? SCAFFOLDS[name];
      if (!s) {
        console.error(chalk.red(`Scaffold "${name}" not found.`));
        process.exit(1);
      }

      if (!scaffoldExists(normalized)) {
        console.error(
          chalk.red(
            `Scaffold "${normalized}" source files are not bundled in this release.`
          )
        );
        process.exit(1);
      }

      const options: InstallOptions = {
        targetDir: opts.dir,
        name: opts.name,
        description: opts.description,
      };

      console.log(
        chalk.dim("Installing ") + chalk.cyan(normalized) + chalk.dim("…")
      );

      try {
        const result = installScaffold(normalized, options);
        console.log(chalk.green("✓ Installed successfully"));
        console.log(chalk.dim("  Directory:    ") + result.targetDir);
        console.log(
          chalk.dim("  Files written:") + " " + result.filesWritten
        );
        if (result.skipped.length > 0) {
          console.log(
            chalk.dim("  Skipped:      ") +
              result.skipped.join(", ")
          );
        }
        console.log();
        console.log(chalk.bold("Next steps:"));
        console.log(chalk.dim(`  cd ${result.targetDir}`));
        console.log(chalk.dim("  bun install"));
        console.log(chalk.dim("  cp .env.example .env"));
        console.log(chalk.dim("  bun dev"));
      } catch (err: unknown) {
        console.error(
          chalk.red("✗ Install failed: ") +
            (err instanceof Error ? err.message : String(err))
        );
        process.exit(1);
      }
    }
  );

program
  .command("categories")
  .description("List scaffold categories with counts")
  .action(() => {
    console.log(chalk.bold(chalk.cyan("CATEGORY".padEnd(16))) + chalk.bold(chalk.cyan("COUNT")));
    console.log(chalk.dim("─".repeat(24)));
    for (const cat of CATEGORIES) {
      const count = getScaffoldsByCategory(cat).length;
      console.log(chalk.green(cat.padEnd(16)) + count);
    }
  });

program
  .command("status")
  .description("Show scaffolds installed in the current project")
  .action(() => {
    const installed = getInstalledScaffolds(process.cwd());
    if (installed.length === 0) {
      console.log(chalk.yellow("No scaffolds installed in this directory."));
      return;
    }
    console.log(
      chalk.bold(`Found ${installed.length} installed scaffold(s):\n`)
    );
    for (const s of installed) {
      console.log(
        chalk.green(` • ${s.id}`) +
          chalk.dim(` (${s.name}) installed ${s.installedAt}`)
      );
    }
  });

type McpAgent = "claude" | "codex" | "gemini" | "all";

const MCP_AGENTS: McpAgent[] = ["claude", "codex", "gemini"];

function validateAgent(value: string, flag: string): McpAgent {
  const valid = ["claude", "codex", "gemini", "all"];
  if (!valid.includes(value)) {
    console.error(
      chalk.red(`Invalid value for ${flag}: "${value}". Valid options: claude, codex, gemini, all`)
    );
    process.exit(1);
  }
  return value as McpAgent;
}

async function runForAgents(
  agent: McpAgent,
  fn: (a: "claude" | "codex" | "gemini") => Promise<void>,
  verb: string
): Promise<void> {
  const targets = agent === "all" ? MCP_AGENTS : [agent];
  for (const target of targets) {
    process.stdout.write(chalk.dim(`  ${verb} ${target}… `));
    try {
      await fn(target);
      console.log(chalk.green("✓"));
    } catch (err: unknown) {
      console.log(chalk.red("✗"));
      console.error(
        chalk.red(`    Error: `) +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }
}

program
  .command("mcp")
  .description(
    "Register or uninstall the Open Scaffolds MCP server with AI coding agents\n\n" +
    "  Agents:  claude · codex · gemini · all\n\n" +
    "  Examples:\n" +
    "    scaffolds mcp --register claude\n" +
    "    scaffolds mcp --register all\n" +
    "    scaffolds mcp --uninstall codex"
  )
  .option("--register <agent>", "Register with: claude, codex, gemini, or all")
  .option("--uninstall <agent>", "Uninstall from: claude, codex, gemini, or all")
  .action(async (opts: { register?: string; uninstall?: string }) => {
    if (!opts.register && !opts.uninstall) {
      console.error(chalk.red("Provide --register <agent> or --uninstall <agent>."));
      console.log(chalk.dim("  scaffolds mcp --register claude"));
      console.log(chalk.dim("  scaffolds mcp --register all"));
      console.log(chalk.dim("  scaffolds mcp --uninstall codex"));
      process.exit(1);
    }

    const registerFns = {
      claude: registerClaude,
      codex: registerCodex,
      gemini: registerGemini,
    } as const;

    const unregisterFns = {
      claude: unregisterClaude,
      codex: unregisterCodex,
      gemini: unregisterGemini,
    } as const;

    if (opts.register) {
      const agent = validateAgent(opts.register, "--register");
      console.log(chalk.bold("Registering Open Scaffolds MCP server…"));
      await runForAgents(agent, (a) => registerFns[a](), "Registering with");
    }

    if (opts.uninstall) {
      const agent = validateAgent(opts.uninstall, "--uninstall");
      console.log(chalk.bold("Uninstalling Open Scaffolds MCP server…"));
      await runForAgents(agent, (a) => unregisterFns[a](), "Uninstalling from");
    }
  });

program.parse(process.argv);
