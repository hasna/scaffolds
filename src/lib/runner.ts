import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getScaffoldSourceDir } from "./installer.js";

export interface RunResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCommand(cmd: string, cwd: string): Promise<RunResult> {
  const proc = Bun.spawn(["sh", "-c", cmd], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    command: cmd,
    exitCode,
    stdout,
    stderr,
  };
}

export async function runPostInstall(targetDir: string): Promise<RunResult[]> {
  const results: RunResult[] = [];

  // Run bun install in the target directory
  const installResult = await runCommand("bun install", targetDir);
  results.push(installResult);

  return results;
}

export function getScaffoldReadme(id: string): string | null {
  const sourceDir = getScaffoldSourceDir(id);

  // Prefer SETUP.md, fall back to README.md
  const candidates = ["SETUP.md", "README.md"];

  for (const filename of candidates) {
    const filePath = join(sourceDir, filename);
    if (existsSync(filePath)) {
      try {
        return readFileSync(filePath, "utf-8");
      } catch {
        return null;
      }
    }
  }

  return null;
}
