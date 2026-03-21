import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  replaceTemplateVars,
  scaffoldExists,
  getInstalledScaffolds,
  installScaffold,
} from "./installer.js";

// ---------- replaceTemplateVars ----------

describe("replaceTemplateVars", () => {
  it("replaces {{name}}", () => {
    expect(replaceTemplateVars("Hello {{name}}!", { name: "myapp" })).toBe(
      "Hello myapp!"
    );
  });

  it("replaces {{description}}", () => {
    expect(
      replaceTemplateVars("Desc: {{description}}", {
        description: "A cool app",
      })
    ).toBe("Desc: A cool app");
  });

  it("replaces {{author}}", () => {
    expect(replaceTemplateVars("By {{author}}", { author: "Hasna" })).toBe(
      "By Hasna"
    );
  });

  it("replaces all three vars at once", () => {
    const template = "{{name}} - {{description}} by {{author}}";
    const result = replaceTemplateVars(template, {
      name: "myapp",
      description: "Best app",
      author: "Hasna",
    });
    expect(result).toBe("myapp - Best app by Hasna");
  });

  it("replaces multiple occurrences of the same var", () => {
    expect(
      replaceTemplateVars("{{name}} and {{name}}", { name: "foo" })
    ).toBe("foo and foo");
  });

  it("leaves unknown placeholders as-is", () => {
    expect(
      replaceTemplateVars("Hello {{unknown}}", { name: "myapp" })
    ).toBe("Hello {{unknown}}");
  });

  it("returns content unchanged when vars object is empty", () => {
    expect(replaceTemplateVars("no vars here", {})).toBe("no vars here");
  });

  it("handles empty string content", () => {
    expect(replaceTemplateVars("", { name: "myapp" })).toBe("");
  });
});

// ---------- scaffoldExists ----------

describe("scaffoldExists", () => {
  it("returns true for scaffold-saas (full id)", () => {
    expect(scaffoldExists("scaffold-saas")).toBe(true);
  });

  it("normalizes bare 'saas' → 'scaffold-saas' and returns true", () => {
    expect(scaffoldExists("saas")).toBe(true);
  });

  it("returns false for scaffold-nonexistent", () => {
    expect(scaffoldExists("scaffold-nonexistent")).toBe(false);
  });

  it("returns false for bare 'nonexistent'", () => {
    expect(scaffoldExists("nonexistent")).toBe(false);
  });
});

// ---------- getInstalledScaffolds ----------

describe("getInstalledScaffolds", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `open-scaffolds-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when .scaffolds/installed.json does not exist", () => {
    const result = getInstalledScaffolds(tmpDir);
    expect(result).toEqual([]);
  });

  it("returns installed scaffolds from existing installed.json", () => {
    const dotScaffolds = join(tmpDir, ".scaffolds");
    mkdirSync(dotScaffolds, { recursive: true });
    const record = [
      {
        id: "scaffold-saas",
        name: "myapp",
        installedAt: new Date().toISOString(),
        targetDir: tmpDir,
      },
    ];
    writeFileSync(
      join(dotScaffolds, "installed.json"),
      JSON.stringify(record, null, 2),
      "utf-8"
    );

    const result = getInstalledScaffolds(tmpDir);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("scaffold-saas");
    expect(result[0].name).toBe("myapp");
  });

  it("returns empty array when installed.json is malformed JSON", () => {
    const dotScaffolds = join(tmpDir, ".scaffolds");
    mkdirSync(dotScaffolds, { recursive: true });
    writeFileSync(join(dotScaffolds, "installed.json"), "not valid json", "utf-8");

    const result = getInstalledScaffolds(tmpDir);
    expect(result).toEqual([]);
  });
});

// ---------- installScaffold ----------

describe("installScaffold", () => {
  it("throws for unknown scaffold id", () => {
    expect(() => installScaffold("scaffold-nonexistent")).toThrow(
      /not found in registry/
    );
  });

  it("throws for bare unknown id", () => {
    expect(() => installScaffold("nonexistent")).toThrow(
      /not found in registry/
    );
  });
});
