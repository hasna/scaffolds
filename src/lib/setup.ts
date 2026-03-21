import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  installScaffold,
  getScaffoldSourceDir,
  type InstallResult,
} from "./installer.js";
import { runCommand, type RunResult } from "./runner.js";
import { runEnvWizard } from "./env-wizard.js";
import {
  registerClaude,
  registerCodex,
  registerGemini,
} from "./mcp-register.js";
import type { EnvVar } from "./registry.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetupOptions {
  scaffoldId: string; // e.g. "scaffold-saas" or "saas"
  targetDir: string; // absolute path to install into
  appName: string; // replaces {{name}}
  description?: string; // replaces {{description}}
  skipEnvWizard?: boolean; // skip interactive env var collection
  skipInstall?: boolean; // skip bun install
  skipDbSetup?: boolean; // skip db:push + db:seed
  skipAgentSetup?: boolean; // skip AI agent registration
  startDevServer?: boolean; // start bun dev after setup
  agents?: ("claude" | "codex" | "gemini")[]; // which agents to register
}

export interface SetupResult {
  scaffoldId: string;
  targetDir: string;
  appName: string;
  envVarsCollected: number;
  installResult?: RunResult;
  dbSetupResult?: RunResult[];
  agentsRegistered: string[];
  devServerStarted: boolean;
  duration: number; // ms
}

// ─── loadEnvManifest ──────────────────────────────────────────────────────────

/**
 * Dynamic import of env.manifest.ts from source dir, returns null if not found.
 */
export async function loadEnvManifest(
  scaffoldSourceDir: string
): Promise<EnvVar[] | null> {
  const candidates = [
    join(scaffoldSourceDir, "env.manifest.ts"),
    join(scaffoldSourceDir, "env.manifest.js"),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const mod = await import(candidate);
      // Support both default export and named `vars` export
      const vars: unknown = mod.default ?? mod.vars ?? mod.ENV_VARS;
      if (Array.isArray(vars)) {
        return vars as EnvVar[];
      }
      return null;
    } catch {
      return null;
    }
  }

  return null;
}

// ─── runSetup ─────────────────────────────────────────────────────────────────

/**
 * Full setup orchestrator. Installs scaffold, collects env vars, runs bun install,
 * optionally sets up DB, registers AI agents, and optionally starts the dev server.
 */
export async function runSetup(options: SetupOptions): Promise<SetupResult> {
  const start = Date.now();

  const {
    scaffoldId,
    targetDir,
    appName,
    description,
    skipEnvWizard = false,
    skipInstall = false,
    skipDbSetup = false,
    skipAgentSetup = false,
    startDevServer = false,
    agents = [],
  } = options;

  const absoluteTargetDir = resolve(targetDir);

  // ── 1. Install scaffold ───────────────────────────────────────────────────
  const _installResult: InstallResult = installScaffold(scaffoldId, {
    targetDir: absoluteTargetDir,
    name: appName,
    description,
  });

  // ── 2. Load env manifest ─────────────────────────────────────────────────
  const normalizedId = scaffoldId.startsWith("scaffold-")
    ? scaffoldId
    : `scaffold-${scaffoldId}`;
  const sourceDir = getScaffoldSourceDir(normalizedId);
  const envVars = await loadEnvManifest(sourceDir);

  // ── 3. Collect env vars ──────────────────────────────────────────────────
  let envVarsCollected = 0;

  if (envVars && envVars.length > 0 && !skipEnvWizard) {
    const collected = await runEnvWizard(
      envVars,
      absoluteTargetDir,
      normalizedId,
      appName
    );
    envVarsCollected = Object.keys(collected).length;
  }

  // ── 4. bun install ───────────────────────────────────────────────────────
  let installResult: RunResult | undefined;

  if (!skipInstall) {
    installResult = await runCommand("bun install", absoluteTargetDir);
  }

  // ── 5. db:push + db:seed ─────────────────────────────────────────────────
  let dbSetupResult: RunResult[] | undefined;

  if (!skipDbSetup) {
    const pkgJsonPath = join(absoluteTargetDir, "package.json");
    let hasDbPush = false;
    let hasDbSeed = false;

    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
          scripts?: Record<string, string>;
        };
        hasDbPush = Boolean(pkg.scripts?.["db:push"]);
        hasDbSeed = Boolean(pkg.scripts?.["db:seed"]);
      } catch {
        // Ignore parse errors
      }
    }

    if (hasDbPush) {
      dbSetupResult = [];

      const pushResult = await runCommand(
        "bun run db:push",
        absoluteTargetDir
      );
      dbSetupResult.push(pushResult);

      if (pushResult.exitCode !== 0) {
        // DB not available — warn but continue
        console.warn(
          `[setup] db:push exited with code ${pushResult.exitCode} (DB may not be running). Skipping db:seed.`
        );
      } else if (hasDbSeed) {
        const seedResult = await runCommand(
          "bun run db:seed",
          absoluteTargetDir
        );
        dbSetupResult.push(seedResult);

        if (seedResult.exitCode !== 0) {
          console.warn(
            `[setup] db:seed exited with code ${seedResult.exitCode}.`
          );
        }
      }
    }
  }

  // ── 6. AI agent registration ─────────────────────────────────────────────
  const agentsRegistered: string[] = [];

  if (!skipAgentSetup && agents.length > 0) {
    const registerFns: Record<
      "claude" | "codex" | "gemini",
      () => Promise<void>
    > = {
      claude: registerClaude,
      codex: registerCodex,
      gemini: registerGemini,
    };

    for (const agent of agents) {
      try {
        await registerFns[agent]();
        agentsRegistered.push(agent);
      } catch (err) {
        console.warn(
          `[setup] Failed to register agent "${agent}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // ── 7. Start dev server ───────────────────────────────────────────────────
  let devServerStarted = false;

  if (startDevServer) {
    try {
      // Determine the app URL from .env if available
      const envPath = join(absoluteTargetDir, ".env");
      let appUrl = "http://localhost:3000";

      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, "utf-8");
        const match = envContent.match(/^APP_URL=(.+)$/m);
        if (match) {
          appUrl = match[1].replace(/^["']|["']$/g, "").trim();
        }
      }

      // Spawn detached dev server
      Bun.spawn(["bun", "dev"], {
        cwd: absoluteTargetDir,
        stdio: ["ignore", "ignore", "ignore"],
      });

      devServerStarted = true;
      console.log(`[setup] Dev server started. Your app: ${appUrl}`);
    } catch (err) {
      console.warn(
        `[setup] Failed to start dev server: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {
    scaffoldId: normalizedId,
    targetDir: absoluteTargetDir,
    appName,
    envVarsCollected,
    installResult,
    dbSetupResult,
    agentsRegistered,
    devServerStarted,
    duration: Date.now() - start,
  };
}
