import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  statSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { SCAFFOLDS, type ScaffoldMeta } from "./registry.js";

export interface InstallOptions {
  targetDir?: string;    // where to install (default: cwd/{{name}})
  name?: string;         // app name to use (replaces {{name}})
  description?: string;  // replaces {{description}}
  overwrite?: boolean;   // overwrite if exists
}

export interface InstallResult {
  scaffold: ScaffoldMeta;
  targetDir: string;
  filesWritten: number;
  skipped: string[];
}

export interface InstalledScaffold {
  id: string;
  name: string;
  installedAt: string;
  targetDir: string;
}

const SKIP_ENTRIES = new Set([
  "node_modules",
  ".git",
  "bun.lock",
  "package-lock.json",
  ".env",
  "dist",
  ".next",
  "build",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".mp4", ".webm", ".ogg", ".mp3", ".wav",
  ".pdf", ".zip", ".tar", ".gz", ".br",
  ".bin", ".exe", ".dll", ".so", ".dylib",
]);

function isBinaryFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  for (const ext of BINARY_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function getScaffoldsDir(): string {
  return join(dirname(new URL(import.meta.url).pathname), "../../scaffolds");
}

export function getScaffoldSourceDir(id: string): string {
  // Support both "scaffold-saas" and bare "saas" as id
  const normalized = id.startsWith("scaffold-") ? id : `scaffold-${id}`;
  return join(getScaffoldsDir(), normalized);
}

export function scaffoldExists(id: string): boolean {
  const normalized = id.startsWith("scaffold-") ? id : `scaffold-${id}`;
  if (!SCAFFOLDS[normalized]) return false;
  return existsSync(getScaffoldSourceDir(id));
}

export function replaceTemplateVars(
  content: string,
  vars: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    // Replace all occurrences of {{key}} with value
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

function copyRecursive(
  src: string,
  dest: string,
  vars: Record<string, string>
): { written: number; skipped: string[] } {
  let written = 0;
  const skipped: string[] = [];

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    if (SKIP_ENTRIES.has(entry)) {
      skipped.push(entry);
      continue;
    }

    const srcPath = join(src, entry);
    // Replace template vars in the filename itself
    const destEntry = replaceTemplateVars(entry, vars);
    const destPath = join(dest, destEntry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      const result = copyRecursive(srcPath, destPath, vars);
      written += result.written;
      skipped.push(...result.skipped);
    } else {
      if (isBinaryFile(entry)) {
        copyFileSync(srcPath, destPath);
      } else {
        const content = readFileSync(srcPath, "utf-8");
        const replaced = replaceTemplateVars(content, vars);
        writeFileSync(destPath, replaced, "utf-8");
      }
      written++;
    }
  }

  return { written, skipped };
}

export function installScaffold(
  id: string,
  options: InstallOptions = {}
): InstallResult {
  const normalized = id.startsWith("scaffold-") ? id : `scaffold-${id}`;
  const meta = SCAFFOLDS[normalized];

  if (!meta) {
    throw new Error(`Scaffold "${id}" not found in registry.`);
  }

  const sourceDir = getScaffoldSourceDir(id);
  if (!existsSync(sourceDir)) {
    throw new Error(
      `Scaffold source directory not found: ${sourceDir}. ` +
        `The scaffold may not be bundled in this version of open-scaffolds.`
    );
  }

  const appName = options.name ?? normalized;
  const appDescription = options.description ?? meta.description;

  const targetDir = resolve(options.targetDir ?? join(process.cwd(), appName));

  if (existsSync(targetDir) && !options.overwrite) {
    throw new Error(
      `Target directory already exists: ${targetDir}. ` +
        `Pass overwrite: true to force installation.`
    );
  }

  const vars: Record<string, string> = {
    name: appName,
    description: appDescription,
    author: "Hasna",
  };

  const { written, skipped } = copyRecursive(sourceDir, targetDir, vars);

  // Record installation metadata
  const dotScaffoldsDir = join(targetDir, ".scaffolds");
  const installedPath = join(dotScaffoldsDir, "installed.json");

  mkdirSync(dotScaffoldsDir, { recursive: true });

  const record: InstalledScaffold = {
    id: normalized,
    name: appName,
    installedAt: new Date().toISOString(),
    targetDir,
  };

  let existing: InstalledScaffold[] = [];
  if (existsSync(installedPath)) {
    try {
      existing = JSON.parse(readFileSync(installedPath, "utf-8"));
    } catch {
      existing = [];
    }
  }

  existing.push(record);
  writeFileSync(installedPath, JSON.stringify(existing, null, 2), "utf-8");

  return {
    scaffold: meta,
    targetDir,
    filesWritten: written,
    skipped,
  };
}

export function getInstalledScaffolds(dir?: string): InstalledScaffold[] {
  const base = dir ?? process.cwd();
  const installedPath = join(base, ".scaffolds", "installed.json");

  if (!existsSync(installedPath)) return [];

  try {
    const raw = readFileSync(installedPath, "utf-8");
    return JSON.parse(raw) as InstalledScaffold[];
  } catch {
    return [];
  }
}
