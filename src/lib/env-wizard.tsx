import React, { useState, useCallback } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { EnvVar } from "./registry.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Replace {{name}} template placeholder in a string with the actual app name.
 */
function applyTemplate(value: string, appName: string): string {
  return value.replace(/\{\{name\}\}/g, appName);
}

/**
 * Group an array of EnvVar by their `group` field, preserving insertion order.
 */
function groupVars(vars: EnvVar[]): Map<string, EnvVar[]> {
  const map = new Map<string, EnvVar[]>();
  for (const v of vars) {
    const existing = map.get(v.group);
    if (existing) {
      existing.push(v);
    } else {
      map.set(v.group, [v]);
    }
  }
  return map;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnvWizardProps {
  vars: EnvVar[];
  targetDir: string;
  scaffoldName: string;
  appName: string;
  onComplete: (values: Record<string, string>) => void;
}

// ─── Wizard Component ─────────────────────────────────────────────────────────

function EnvWizard({
  vars,
  targetDir,
  scaffoldName,
  appName,
  onComplete,
}: EnvWizardProps) {
  const { exit } = useApp();

  const resolveDefault = (v: EnvVar | undefined): string =>
    v?.default ? applyTemplate(v.default, appName) : "";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState(() => resolveDefault(vars[0]));
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [writtenPath, setWrittenPath] = useState("");

  const currentVar = vars[currentIndex];
  const resolvedDefault = resolveDefault(currentVar);

  // Advance to the next var or finish
  const advance = useCallback(
    (values: Record<string, string>) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= vars.length) {
        const envPath = writeEnvFileWithMeta(values, vars, targetDir);
        setWrittenPath(envPath);
        setDone(true);
        onComplete(values);
      } else {
        setCurrentIndex(nextIndex);
        setInputValue(resolveDefault(vars[nextIndex]));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, vars, targetDir, appName, onComplete]
  );

  // Handle Enter submission for current field
  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();

      let finalValue: string;
      if (trimmed !== "") {
        finalValue = trimmed;
      } else if (resolvedDefault) {
        finalValue = resolvedDefault;
      } else if (!currentVar.required) {
        finalValue = "";
      } else {
        // Required, no value, no default — flash empty and wait
        setInputValue("");
        return;
      }

      const updated = { ...collected };
      if (finalValue !== "") {
        updated[currentVar.key] = finalValue;
      }
      setCollected(updated);
      advance(updated);
    },
    [currentVar, resolvedDefault, collected, advance]
  );

  // After the wizard completes, pressing Enter exits the Ink app
  useInput(
    (_input, key) => {
      if (key.return) exit();
    },
    { isActive: done }
  );

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">
          ✓ Environment setup complete
        </Text>
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Text>
            <Text dimColor>Scaffold: </Text>
            <Text color="cyan">{scaffoldName}</Text>
          </Text>
          <Text>
            <Text dimColor>App name: </Text>
            <Text color="cyan">{appName}</Text>
          </Text>
          <Text>
            <Text dimColor>Written:  </Text>
            <Text color="green">{writtenPath}</Text>
          </Text>
          <Text>
            <Text dimColor>Vars set: </Text>
            <Text>
              {Object.keys(collected).length} / {vars.length}
            </Text>
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      </Box>
    );
  }

  if (!currentVar) return null;

  const total = vars.length;
  const progress = `${currentIndex + 1}/${total}`;
  const isRequired = currentVar.required;
  const hasDefault = Boolean(resolvedDefault);
  const isSecret = currentVar.secret;

  // ── Active input screen ──────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Setting up {scaffoldName}
        </Text>
        <Text dimColor> — var {progress}</Text>
      </Box>

      {/* Group badge */}
      <Box>
        <Text dimColor>[</Text>
        <Text color="yellow">{currentVar.group}</Text>
        <Text dimColor>]</Text>
      </Box>

      {/* Label + required/optional marker */}
      <Box marginTop={1}>
        <Text bold>{currentVar.label}</Text>
        {isRequired ? (
          <Text color="red"> *</Text>
        ) : (
          <Text dimColor> (optional)</Text>
        )}
      </Box>

      {/* Description */}
      <Box>
        <Text dimColor>{currentVar.description}</Text>
      </Box>

      {/* Hint */}
      {currentVar.hint && (
        <Box>
          <Text dimColor>  → {currentVar.hint}</Text>
        </Box>
      )}

      {/* Default value helper */}
      {hasDefault && (
        <Box>
          <Text dimColor>  Default: </Text>
          <Text color="green" dimColor>
            {isSecret ? "***" : resolvedDefault}
          </Text>
          <Text dimColor> (Enter to accept)</Text>
        </Box>
      )}

      {/* Skip hint for optional vars with no default */}
      {!isRequired && !hasDefault && (
        <Box>
          <Text dimColor>  (optional, press Enter to skip)</Text>
        </Box>
      )}

      {/* Input row */}
      <Box marginTop={1}>
        <Text color="cyan">{currentVar.key}</Text>
        <Text dimColor>=</Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder={
            hasDefault && !isSecret
              ? resolvedDefault
              : isSecret
                ? "(secret)"
                : ""
          }
          mask={isSecret ? "*" : undefined}
        />
      </Box>

      {/* Footer nav hint */}
      <Box marginTop={1}>
        <Text dimColor>Enter to confirm  •  Ctrl+C to abort</Text>
      </Box>
    </Box>
  );
}

// ─── writeEnvFile ─────────────────────────────────────────────────────────────

/**
 * Write a .env file from a flat key→value record without group metadata.
 * Returns the absolute path to the written file.
 */
export function writeEnvFile(
  values: Record<string, string>,
  targetDir: string
): string {
  const lines: string[] = [
    `# .env — generated by open-scaffolds`,
    `# Generated: ${new Date().toISOString()}`,
    ``,
  ];

  for (const [key, value] of Object.entries(values)) {
    const needsQuotes = /[\s#"'\\]/.test(value);
    lines.push(
      `${key}=${needsQuotes ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value}`
    );
  }

  lines.push("");

  mkdirSync(targetDir, { recursive: true });
  const envPath = join(targetDir, ".env");
  writeFileSync(envPath, lines.join("\n"), "utf-8");
  return envPath;
}

/**
 * Write a .env file with section headers grouped by EnvVar.group.
 * Only vars that have a value in `values` are written.
 * Returns the absolute path to the written file.
 */
export function writeEnvFileWithMeta(
  values: Record<string, string>,
  vars: EnvVar[],
  targetDir: string
): string {
  const groups = groupVars(vars);
  const lines: string[] = [
    `# .env — generated by open-scaffolds`,
    `# Generated: ${new Date().toISOString()}`,
    ``,
  ];

  for (const [groupName, groupVarsList] of groups) {
    const groupLines: string[] = [];

    for (const v of groupVarsList) {
      const value = values[v.key];
      if (value === undefined || value === "") continue;

      const needsQuotes = /[\s#"'\\]/.test(value);
      groupLines.push(
        `${v.key}=${needsQuotes ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value}`
      );
    }

    if (groupLines.length === 0) continue;

    const pad = Math.max(0, 50 - groupName.length - 4);
    lines.push(`# ── ${groupName} ${"─".repeat(pad)}`);
    lines.push(...groupLines);
    lines.push("");
  }

  mkdirSync(targetDir, { recursive: true });
  const envPath = join(targetDir, ".env");
  writeFileSync(envPath, lines.join("\n"), "utf-8");
  return envPath;
}

// ─── runEnvWizard ─────────────────────────────────────────────────────────────

/**
 * Render the interactive Ink env wizard and return a promise that resolves to
 * the collected key→value map once the user finishes all prompts.
 */
export async function runEnvWizard(
  vars: EnvVar[],
  targetDir: string,
  scaffoldName: string,
  appName: string
): Promise<Record<string, string>> {
  return new Promise<Record<string, string>>((resolve) => {
    // onComplete is called by the wizard after the last field is submitted.
    // We capture the values and let the Ink app wind down naturally (the user
    // presses Enter on the done screen, which calls exit()).
    function WizardApp() {
      return (
        <EnvWizard
          vars={vars}
          targetDir={targetDir}
          scaffoldName={scaffoldName}
          appName={appName}
          onComplete={(values) => {
            resolve(values);
          }}
        />
      );
    }

    render(<WizardApp />);
    // Ink manages its own event loop; this function returns once render()
    // has started. The promise resolves when onComplete fires.
  });
}

// Re-export EnvVar type so consumers can import it from env-wizard
export type { EnvVar };
