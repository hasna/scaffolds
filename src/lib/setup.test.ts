import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadEnvManifest, runSetup } from "./setup.js";
import { getScaffoldSourceDir } from "./installer.js";

// ---------- loadEnvManifest ----------

describe("loadEnvManifest", () => {
  it("returns an array for scaffold-saas source dir (has env.manifest.ts)", async () => {
    const sourceDir = getScaffoldSourceDir("scaffold-saas");
    const result = await loadEnvManifest(sourceDir);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns null for a non-existent path", async () => {
    const result = await loadEnvManifest("/tmp/__this_path_does_not_exist__");
    expect(result).toBeNull();
  });
});

// ---------- runSetup ----------

describe("runSetup", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "open-scaffolds-setup-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws for unknown scaffold id", async () => {
    await expect(
      runSetup({
        scaffoldId: "scaffold-nonexistent",
        targetDir: tmpDir,
        appName: "testapp",
        skipEnvWizard: true,
        skipInstall: true,
        skipDbSetup: true,
        skipAgentSetup: true,
      })
    ).rejects.toThrow(/not found in registry/);
  });

  it("installs scaffold-saas with all steps skipped and returns correct shape", async () => {
    // Use a non-existent subdir so installScaffold doesn't error on existing dir
    const targetDir = join(tmpDir, "myapp");

    const result = await runSetup({
      scaffoldId: "scaffold-saas",
      targetDir,
      appName: "myapp",
      skipEnvWizard: true,
      skipInstall: true,
      skipDbSetup: true,
      skipAgentSetup: true,
    });

    // Result shape
    expect(result.scaffoldId).toBe("scaffold-saas");
    expect(result.targetDir).toBe(targetDir);
    expect(result.appName).toBe("myapp");
    expect(result.envVarsCollected).toBe(0);
    expect(result.agentsRegistered).toEqual([]);
    expect(result.devServerStarted).toBe(false);
    expect(typeof result.duration).toBe("number");
    expect(result.duration).toBeGreaterThanOrEqual(0);

    // Files were copied
    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
  });

  it("bare scaffold id 'saas' also works", async () => {
    const targetDir = join(tmpDir, "bareapp");

    const result = await runSetup({
      scaffoldId: "saas",
      targetDir,
      appName: "bareapp",
      skipEnvWizard: true,
      skipInstall: true,
      skipDbSetup: true,
      skipAgentSetup: true,
    });

    expect(result.scaffoldId).toBe("scaffold-saas");
    expect(result.appName).toBe("bareapp");
  });

  it("installResult is undefined when skipInstall is true", async () => {
    const targetDir = join(tmpDir, "app-ninstall");

    const result = await runSetup({
      scaffoldId: "scaffold-saas",
      targetDir,
      appName: "myapp",
      skipEnvWizard: true,
      skipInstall: true,
      skipDbSetup: true,
      skipAgentSetup: true,
    });

    expect(result.installResult).toBeUndefined();
  });

  it("dbSetupResult is undefined when skipDbSetup is true", async () => {
    const targetDir = join(tmpDir, "app-nodb");

    const result = await runSetup({
      scaffoldId: "scaffold-saas",
      targetDir,
      appName: "myapp",
      skipEnvWizard: true,
      skipInstall: true,
      skipDbSetup: true,
      skipAgentSetup: true,
    });

    expect(result.dbSetupResult).toBeUndefined();
  });
});
