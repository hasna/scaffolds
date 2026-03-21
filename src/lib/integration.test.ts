import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installScaffold, getInstalledScaffolds, scaffoldExists, getScaffoldSourceDir } from "./installer.js";
import { searchScaffolds, getScaffold, SCAFFOLDS } from "./registry.js";

describe("integration: install flow", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
    tempDirs.length = 0;
  });

  test("SCAFFOLDS registry has exactly 8 entries", () => {
    const keys = Object.keys(SCAFFOLDS);
    expect(keys.length).toBe(8);
  });

  test("scaffold-saas source dir actually exists on disk", () => {
    const sourceDir = getScaffoldSourceDir("scaffold-saas");
    expect(existsSync(sourceDir)).toBe(true);
  });

  test("searchScaffolds returns results matching registry entries", () => {
    const results = searchScaffolds("saas");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("scaffold-saas");

    // All returned results should be in the registry
    for (const result of results) {
      expect(SCAFFOLDS[result.id]).toBeDefined();
    }
  });

  test("searchScaffolds with 'blog' returns scaffold-blog", () => {
    const results = searchScaffolds("blog");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("scaffold-blog");
  });

  test("searchScaffolds with empty string returns all scaffolds", () => {
    // empty string matches everything via includes("")
    const results = searchScaffolds("");
    expect(results.length).toBe(Object.keys(SCAFFOLDS).length);
  });

  test("getScaffold returns correct entry for scaffold-saas", () => {
    const meta = getScaffold("scaffold-saas");
    expect(meta).toBeDefined();
    expect(meta!.id).toBe("scaffold-saas");
    expect(meta!.category).toBe("App");
    expect(meta!.techStack).toContain("Next.js");
  });

  test("getScaffold returns undefined for unknown id", () => {
    const meta = getScaffold("scaffold-nonexistent");
    expect(meta).toBeUndefined();
  });

  test("installScaffold copies files and writes installed.json for scaffold-saas", () => {
    const base = mkdtempSync(join(tmpdir(), "open-scaffolds-test-"));
    tempDirs.push(base);

    const targetDir = join(base, "my-saas-app");

    const result = installScaffold("saas", {
      targetDir,
      name: "my-saas-app",
      description: "Test SaaS app",
    });

    // Result shape is correct
    expect(result.scaffold.id).toBe("scaffold-saas");
    expect(result.targetDir).toBe(targetDir);
    expect(result.filesWritten).toBeGreaterThan(0);

    // Target dir was created
    expect(existsSync(targetDir)).toBe(true);

    // .scaffolds/installed.json was written
    const installedPath = join(targetDir, ".scaffolds", "installed.json");
    expect(existsSync(installedPath)).toBe(true);

    const records = JSON.parse(readFileSync(installedPath, "utf-8"));
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBe(1);
    expect(records[0].id).toBe("scaffold-saas");
    expect(records[0].name).toBe("my-saas-app");
    expect(records[0].installedAt).toBeDefined();
    expect(records[0].targetDir).toBe(targetDir);
  });

  test("installScaffold throws if target dir already exists without overwrite", () => {
    const base = mkdtempSync(join(tmpdir(), "open-scaffolds-test-"));
    tempDirs.push(base);

    const targetDir = join(base, "my-saas-app");

    // First install succeeds
    installScaffold("saas", { targetDir, name: "my-saas-app" });

    // Second install should throw
    expect(() => {
      installScaffold("saas", { targetDir, name: "my-saas-app" });
    }).toThrow(/already exists/);
  });

  test("installScaffold overwrites when overwrite: true", () => {
    const base = mkdtempSync(join(tmpdir(), "open-scaffolds-test-"));
    tempDirs.push(base);

    const targetDir = join(base, "my-saas-app");

    installScaffold("saas", { targetDir, name: "my-saas-app" });
    // Second install with overwrite should not throw
    const result = installScaffold("saas", { targetDir, name: "my-saas-app", overwrite: true });
    expect(result.scaffold.id).toBe("scaffold-saas");
  });

  test("getInstalledScaffolds returns installed records from target dir", () => {
    const base = mkdtempSync(join(tmpdir(), "open-scaffolds-test-"));
    tempDirs.push(base);

    const targetDir = join(base, "my-saas-app");

    installScaffold("saas", { targetDir, name: "my-saas-app" });

    const installed = getInstalledScaffolds(targetDir);
    expect(installed.length).toBe(1);
    expect(installed[0].id).toBe("scaffold-saas");
    expect(installed[0].name).toBe("my-saas-app");
  });

  test("scaffoldExists returns true for scaffold-saas", () => {
    expect(scaffoldExists("scaffold-saas")).toBe(true);
    expect(scaffoldExists("saas")).toBe(true);
  });

  test("scaffoldExists returns false for non-existent scaffold", () => {
    expect(scaffoldExists("scaffold-nonexistent")).toBe(false);
    expect(scaffoldExists("nonexistent")).toBe(false);
  });

  test("installScaffold throws for unknown scaffold id", () => {
    const base = mkdtempSync(join(tmpdir(), "open-scaffolds-test-"));
    tempDirs.push(base);

    expect(() => {
      installScaffold("nonexistent", { targetDir: join(base, "out") });
    }).toThrow(/not found in registry/);
  });
});
