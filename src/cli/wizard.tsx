import React, { useState, useCallback, useEffect } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import chalk from "chalk";
import { resolve, join } from "node:path";
import { SCAFFOLDS, type ScaffoldMeta } from "../lib/registry.js";
import { runEnvWizard } from "../lib/env-wizard.js";
import { loadEnvManifest, runSetup } from "../lib/setup.js";
import { getScaffoldSourceDir } from "../lib/installer.js";
import type { EnvVar } from "../lib/registry.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep =
  | "choose-scaffold"
  | "app-name"
  | "target-dir"
  | "confirm-options"
  | "env-vars"
  | "installing"
  | "done";

interface WizardState {
  step: WizardStep;
  scaffoldId: string;
  appName: string;
  targetDir: string;
  runEnv: boolean;
  runInstall: boolean;
  runDb: boolean;
  registerAgents: boolean;
  startDev: boolean;
  error: string | null;
  result: {
    envVarsCollected: number;
    agentsRegistered: string[];
    devServerStarted: boolean;
    duration: number;
  } | null;
}

// ─── Steps indicator ─────────────────────────────────────────────────────────

const ALL_STEPS: { key: WizardStep; label: string }[] = [
  { key: "choose-scaffold", label: "Choose scaffold" },
  { key: "app-name", label: "App name" },
  { key: "target-dir", label: "Target dir" },
  { key: "confirm-options", label: "Options" },
  { key: "env-vars", label: "Environment" },
  { key: "installing", label: "Install" },
  { key: "done", label: "Done" },
];

function StepsIndicator({ current }: { current: WizardStep }) {
  const currentIdx = ALL_STEPS.findIndex((s) => s.key === current);

  return (
    <Box marginBottom={1} flexWrap="wrap">
      {ALL_STEPS.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const isPending = i > currentIdx;

        const dot = isDone ? "✓" : isActive ? "●" : "○";
        const color = isDone ? "green" : isActive ? "cyan" : undefined;

        return (
          <Box key={s.key} marginRight={1}>
            <Text color={color} dimColor={isPending}>
              {dot} {s.label}
              {i < ALL_STEPS.length - 1 ? "  " : ""}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── ChooseScaffold step ─────────────────────────────────────────────────────

function ChooseScaffoldStep({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const scaffolds = Object.values(SCAFFOLDS);

  const items = scaffolds.map((s: ScaffoldMeta) => ({
    label:
      `${chalk.green(s.id.padEnd(26))}` +
      ` ${chalk.yellow(`[${s.category}]`.padEnd(6))}` +
      ` ${s.description.slice(0, 44)}${s.description.length > 44 ? "…" : ""}`,
    value: s.id,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <StepsIndicator current="choose-scaffold" />
      <Text bold color="cyan">
        Which scaffold would you like to use?
      </Text>
      <Text dimColor>{"─".repeat(70)}</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item: { value: string }) => onSelect(item.value)}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate  Enter select  Ctrl+C quit</Text>
      </Box>
    </Box>
  );
}

// ─── AppName step ─────────────────────────────────────────────────────────────

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AppNameStep({
  scaffoldId,
  onSubmit,
}: {
  scaffoldId: string;
  onSubmit: (name: string) => void;
}) {
  const bare = scaffoldId.replace(/^scaffold-/, "");
  const suggested = `my-${bare}`;
  const [value, setValue] = useState(suggested);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(v: string) {
    const name = v.trim() || suggested;
    if (/\s/.test(name)) {
      setError(
        `App name cannot contain spaces. Try: ${chalk.cyan(toKebab(name))}`
      );
      return;
    }
    setError(null);
    onSubmit(name);
  }

  return (
    <Box flexDirection="column" padding={1}>
      <StepsIndicator current="app-name" />
      <Text bold color="cyan">
        What&apos;s your app called?
      </Text>
      <Text dimColor>No spaces — use kebab-case (e.g. my-app)</Text>
      <Box marginTop={1}>
        <Text color="cyan">name: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── TargetDir step ───────────────────────────────────────────────────────────

function TargetDirStep({
  appName,
  onSubmit,
}: {
  appName: string;
  onSubmit: (dir: string) => void;
}) {
  const defaultDir = `./${appName}`;
  const [value, setValue] = useState(defaultDir);

  function handleSubmit(v: string) {
    const dir = v.trim() || defaultDir;
    onSubmit(resolve(dir));
  }

  return (
    <Box flexDirection="column" padding={1}>
      <StepsIndicator current="target-dir" />
      <Text bold color="cyan">
        Where should we create the project?
      </Text>
      <Text dimColor>Press Enter to accept the default.</Text>
      <Box marginTop={1}>
        <Text color="cyan">dir: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}

// ─── ConfirmOptions step ──────────────────────────────────────────────────────

type OptionKey = "runEnv" | "runInstall" | "runDb" | "registerAgents" | "startDev";

const OPTION_ITEMS: { label: string; key: OptionKey }[] = [
  { label: "Set up environment variables", key: "runEnv" },
  { label: "Run bun install", key: "runInstall" },
  { label: "Set up database (db:push + db:seed)", key: "runDb" },
  { label: "Register with AI agents (Claude / Codex / Gemini)", key: "registerAgents" },
  { label: "Start dev server when done", key: "startDev" },
];

function ConfirmOptionsStep({
  appName,
  targetDir,
  scaffoldId,
  defaults,
  onConfirm,
}: {
  appName: string;
  targetDir: string;
  scaffoldId: string;
  defaults: Record<OptionKey, boolean>;
  onConfirm: (opts: Record<OptionKey, boolean>) => void;
}) {
  const [selected, setSelected] = useState<Record<OptionKey, boolean>>(defaults);
  const [cursor, setCursor] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor((c) => Math.min(OPTION_ITEMS.length, c - 1 + 2)); // +1 for confirm
    } else if (key.return) {
      if (cursor < OPTION_ITEMS.length) {
        // Toggle the checkbox
        const optKey = OPTION_ITEMS[cursor].key;
        setSelected((prev) => ({ ...prev, [optKey]: !prev[optKey] }));
      } else {
        // Confirm button
        onConfirm(selected);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <StepsIndicator current="confirm-options" />
      <Text bold color="cyan">
        Confirm setup options
      </Text>
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Text>
          <Text dimColor>Scaffold: </Text>
          <Text color="yellow">{scaffoldId}</Text>
        </Text>
        <Text>
          <Text dimColor>App name: </Text>
          <Text color="yellow">{appName}</Text>
        </Text>
        <Text>
          <Text dimColor>Directory: </Text>
          <Text color="yellow">{targetDir}</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {OPTION_ITEMS.map((item, i) => {
          const checked = selected[item.key];
          const isCursor = cursor === i;
          return (
            <Box key={item.key}>
              <Text color={isCursor ? "cyan" : undefined}>
                {isCursor ? "▶ " : "  "}
                {checked ? "✓" : "○"} {item.label}
              </Text>
            </Box>
          );
        })}
        <Box marginTop={1}>
          <Text color={cursor === OPTION_ITEMS.length ? "green" : "white"} bold={cursor === OPTION_ITEMS.length}>
            {cursor === OPTION_ITEMS.length ? "▶ " : "  "}
            {chalk.bold("[ Continue ]")}
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate  Space/Enter toggle  Enter on Continue to proceed</Text>
      </Box>
    </Box>
  );
}

// ─── Installing step ──────────────────────────────────────────────────────────

interface InstallStep {
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  detail?: string;
}

function InstallingStep({
  scaffoldId,
  targetDir,
  appName,
  opts,
  onDone,
  onError,
}: {
  scaffoldId: string;
  targetDir: string;
  appName: string;
  opts: Record<OptionKey, boolean>;
  onDone: (result: {
    envVarsCollected: number;
    agentsRegistered: string[];
    devServerStarted: boolean;
    duration: number;
  }) => void;
  onError: (msg: string) => void;
}) {
  const [steps, setSteps] = useState<InstallStep[]>([
    { label: "Installing scaffold files", status: "pending" },
    { label: "Loading env manifest", status: "pending" },
    { label: opts.runEnv ? "Collecting env vars" : "Env vars (skipped)", status: "pending" },
    { label: opts.runInstall ? "Running bun install" : "bun install (skipped)", status: "pending" },
    { label: opts.runDb ? "Setting up database" : "Database setup (skipped)", status: "pending" },
    { label: opts.registerAgents ? "Registering AI agents" : "Agent registration (skipped)", status: "pending" },
    { label: opts.startDev ? "Starting dev server" : "Dev server (skipped)", status: "pending" },
  ]);

  const updateStep = useCallback((i: number, update: Partial<InstallStep>) => {
    setSteps((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...update };
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const start = Date.now();

      // Step 0: install scaffold
      updateStep(0, { status: "running" });
      try {
        const { installScaffold } = await import("../lib/installer.js");
        installScaffold(scaffoldId, { targetDir, name: appName });
        if (cancelled) return;
        updateStep(0, { status: "done" });
      } catch (err) {
        if (cancelled) return;
        updateStep(0, { status: "error", detail: err instanceof Error ? err.message : String(err) });
        onError(err instanceof Error ? err.message : String(err));
        return;
      }

      // Step 1: load env manifest
      updateStep(1, { status: "running" });
      let envVars: EnvVar[] | null = null;
      try {
        const normalizedId = scaffoldId.startsWith("scaffold-")
          ? scaffoldId
          : `scaffold-${scaffoldId}`;
        const sourceDir = getScaffoldSourceDir(normalizedId);
        envVars = await loadEnvManifest(sourceDir);
        if (cancelled) return;
        updateStep(1, { status: "done", detail: envVars ? `${envVars.length} vars found` : "none" });
      } catch {
        if (cancelled) return;
        updateStep(1, { status: "done", detail: "no manifest" });
      }

      // Step 2: env vars
      let envVarsCollected = 0;
      if (opts.runEnv && envVars && envVars.length > 0) {
        updateStep(2, { status: "running" });
        try {
          const collected = await runEnvWizard(envVars, targetDir, scaffoldId, appName);
          if (cancelled) return;
          envVarsCollected = Object.keys(collected).length;
          updateStep(2, { status: "done", detail: `${envVarsCollected} vars set` });
        } catch (err) {
          if (cancelled) return;
          updateStep(2, { status: "error", detail: err instanceof Error ? err.message : String(err) });
        }
      } else {
        updateStep(2, { status: "skipped" });
      }

      // Step 3: bun install
      if (opts.runInstall) {
        updateStep(3, { status: "running" });
        try {
          const { runCommand } = await import("../lib/runner.js");
          const result = await runCommand("bun install", targetDir);
          if (cancelled) return;
          updateStep(3, {
            status: result.exitCode === 0 ? "done" : "error",
            detail: result.exitCode !== 0 ? `exit code ${result.exitCode}` : undefined,
          });
        } catch (err) {
          if (cancelled) return;
          updateStep(3, { status: "error", detail: err instanceof Error ? err.message : String(err) });
        }
      } else {
        updateStep(3, { status: "skipped" });
      }

      // Step 4: db:push + db:seed
      if (opts.runDb) {
        updateStep(4, { status: "running" });
        try {
          const { readFileSync, existsSync } = await import("node:fs");
          const { join } = await import("node:path");
          const { runCommand } = await import("../lib/runner.js");

          const pkgPath = join(targetDir, "package.json");
          let hasDbPush = false;
          let hasDbSeed = false;
          if (existsSync(pkgPath)) {
            try {
              const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
                scripts?: Record<string, string>;
              };
              hasDbPush = Boolean(pkg.scripts?.["db:push"]);
              hasDbSeed = Boolean(pkg.scripts?.["db:seed"]);
            } catch { /* ignore */ }
          }

          if (hasDbPush) {
            const pushResult = await runCommand("bun run db:push", targetDir);
            if (cancelled) return;
            if (pushResult.exitCode === 0 && hasDbSeed) {
              await runCommand("bun run db:seed", targetDir);
            }
          }
          if (cancelled) return;
          updateStep(4, { status: "done" });
        } catch (err) {
          if (cancelled) return;
          updateStep(4, { status: "error", detail: err instanceof Error ? err.message : String(err) });
        }
      } else {
        updateStep(4, { status: "skipped" });
      }

      // Step 5: AI agent registration
      const agentsRegistered: string[] = [];
      if (opts.registerAgents) {
        updateStep(5, { status: "running" });
        try {
          const { registerClaude, registerCodex, registerGemini } = await import("../lib/mcp-register.js");
          for (const [name, fn] of [
            ["claude", registerClaude],
            ["codex", registerCodex],
            ["gemini", registerGemini],
          ] as const) {
            try {
              await fn();
              agentsRegistered.push(name);
            } catch { /* warn but continue */ }
          }
          if (cancelled) return;
          updateStep(5, { status: "done", detail: agentsRegistered.join(", ") || "none registered" });
        } catch (err) {
          if (cancelled) return;
          updateStep(5, { status: "error", detail: err instanceof Error ? err.message : String(err) });
        }
      } else {
        updateStep(5, { status: "skipped" });
      }

      // Step 6: start dev server
      let devServerStarted = false;
      if (opts.startDev) {
        updateStep(6, { status: "running" });
        try {
          Bun.spawn(["bun", "dev"], {
            cwd: targetDir,
            stdio: ["ignore", "ignore", "ignore"],
          });
          devServerStarted = true;
          if (cancelled) return;
          updateStep(6, { status: "done" });
        } catch (err) {
          if (cancelled) return;
          updateStep(6, { status: "error", detail: err instanceof Error ? err.message : String(err) });
        }
      } else {
        updateStep(6, { status: "skipped" });
      }

      onDone({
        envVarsCollected,
        agentsRegistered,
        devServerStarted,
        duration: Date.now() - start,
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIcon = (s: InstallStep["status"]) => {
    switch (s) {
      case "done": return chalk.green("✓");
      case "running": return chalk.yellow("⟳");
      case "error": return chalk.red("✗");
      case "skipped": return chalk.dim("–");
      default: return chalk.dim("○");
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <StepsIndicator current="installing" />
      <Text bold color="cyan">
        Setting up your project…
      </Text>
      <Box marginTop={1} flexDirection="column">
        {steps.map((s, i) => (
          <Box key={i}>
            <Text>
              {stepIcon(s.status)} {s.label}
              {s.detail ? chalk.dim(` (${s.detail})`) : ""}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneStep({
  scaffoldId,
  appName,
  targetDir,
  result,
}: {
  scaffoldId: string;
  appName: string;
  targetDir: string;
  result: {
    envVarsCollected: number;
    agentsRegistered: string[];
    devServerStarted: boolean;
    duration: number;
  };
}) {
  const { exit } = useApp();

  useInput((_input, key) => {
    if (key.return || key.escape) exit();
  });

  const relDir = targetDir.startsWith(process.cwd())
    ? `.${targetDir.slice(process.cwd().length)}`
    : targetDir;

  return (
    <Box flexDirection="column" padding={1}>
      <StepsIndicator current="done" />
      <Text bold color="green">
        ✓ {scaffoldId} installed to {relDir}
      </Text>
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Text>
          <Text dimColor>App name: </Text>
          <Text color="cyan">{appName}</Text>
        </Text>
        {result.envVarsCollected > 0 && (
          <Text>
            <Text dimColor>Env vars:  </Text>
            <Text>{result.envVarsCollected} collected → .env</Text>
          </Text>
        )}
        {result.agentsRegistered.length > 0 && (
          <Text>
            <Text dimColor>Agents:    </Text>
            <Text>{result.agentsRegistered.join(", ")}</Text>
          </Text>
        )}
        <Text>
          <Text dimColor>Duration:  </Text>
          <Text>{(result.duration / 1000).toFixed(1)}s</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Next steps:</Text>
        <Text color="cyan">  cd {relDir}</Text>
        {!result.devServerStarted && (
          <Text color="cyan">  bun dev          </Text>
        )}
        {result.devServerStarted && (
          <Text color="cyan">  # dev server already running</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Your app: http://localhost:3000</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Enter to exit.</Text>
      </Box>
    </Box>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorStep({ message }: { message: string }) {
  const { exit } = useApp();

  useInput((_input, key) => {
    if (key.return || key.escape) exit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">
        ✗ Setup failed
      </Text>
      <Box marginTop={1}>
        <Text color="red">{message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Enter to exit.</Text>
      </Box>
    </Box>
  );
}

// ─── CreateWizard component ───────────────────────────────────────────────────

export interface CreateWizardProps {
  initialScaffoldId?: string;
}

export function CreateWizard({ initialScaffoldId }: CreateWizardProps) {
  const [state, setState] = useState<WizardState>(() => ({
    step: initialScaffoldId ? "app-name" : "choose-scaffold",
    scaffoldId: initialScaffoldId ?? "",
    appName: "",
    targetDir: "",
    runEnv: true,
    runInstall: true,
    runDb: true,
    registerAgents: true,
    startDev: false,
    error: null,
    result: null,
  }));

  const go = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  if (state.step === "choose-scaffold") {
    return (
      <ChooseScaffoldStep
        onSelect={(id) => go({ scaffoldId: id, step: "app-name" })}
      />
    );
  }

  if (state.step === "app-name") {
    return (
      <AppNameStep
        scaffoldId={state.scaffoldId}
        onSubmit={(name) => go({ appName: name, step: "target-dir" })}
      />
    );
  }

  if (state.step === "target-dir") {
    return (
      <TargetDirStep
        appName={state.appName}
        onSubmit={(dir) => go({ targetDir: dir, step: "confirm-options" })}
      />
    );
  }

  if (state.step === "confirm-options") {
    return (
      <ConfirmOptionsStep
        appName={state.appName}
        targetDir={state.targetDir}
        scaffoldId={state.scaffoldId}
        defaults={{
          runEnv: state.runEnv,
          runInstall: state.runInstall,
          runDb: state.runDb,
          registerAgents: state.registerAgents,
          startDev: state.startDev,
        }}
        onConfirm={(opts) =>
          go({
            ...opts,
            step: opts.runEnv ? "installing" : "installing",
          })
        }
      />
    );
  }

  if (state.step === "installing") {
    return (
      <InstallingStep
        scaffoldId={state.scaffoldId}
        targetDir={state.targetDir}
        appName={state.appName}
        opts={{
          runEnv: state.runEnv,
          runInstall: state.runInstall,
          runDb: state.runDb,
          registerAgents: state.registerAgents,
          startDev: state.startDev,
        }}
        onDone={(result) => go({ result, step: "done" })}
        onError={(msg) => go({ error: msg, step: "done" })}
      />
    );
  }

  if (state.step === "done") {
    if (state.error) {
      return <ErrorStep message={state.error} />;
    }
    return (
      <DoneStep
        scaffoldId={state.scaffoldId}
        appName={state.appName}
        targetDir={state.targetDir}
        result={state.result!}
      />
    );
  }

  return null;
}

// ─── runCreateWizard ──────────────────────────────────────────────────────────

/**
 * Launch the interactive create wizard and return after it completes.
 */
export async function runCreateWizard(scaffoldId?: string): Promise<void> {
  return new Promise<void>((resolvePromise) => {
    function WizardApp() {
      return <CreateWizard initialScaffoldId={scaffoldId} />;
    }

    const { unmount } = render(<WizardApp />);

    // Resolve once Ink exits
    const checkInterval = setInterval(() => {
      // Ink calls process.exit or the app exits naturally after useApp().exit()
      // We can't hook into Ink's exit cleanly in all versions,
      // so we resolve here and let the process continue.
      clearInterval(checkInterval);
      unmount();
      resolvePromise();
    }, 100);

    // Allow time for the wizard to render — actual completion happens via useApp().exit()
    // which unmounts the Ink app. The promise resolves on unmount.
    process.once("exit", () => {
      clearInterval(checkInterval);
      resolvePromise();
    });
  });
}
