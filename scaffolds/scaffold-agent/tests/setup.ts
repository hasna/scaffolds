/**
 * Test setup and utilities
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertDefined<T>(
  value: T | undefined | null,
  message: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${message}: expected defined value, got ${value}`);
  }
}

export async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`✅ ${name} (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${name} (${duration}ms)`);
    console.error(`   Error: ${message}`);
    return false;
  }
}

export interface TestSuite {
  name: string;
  tests: Array<{ name: string; fn: () => Promise<void> }>;
}

export async function runSuite(suite: TestSuite): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  console.log(`\n📦 ${suite.name}`);
  console.log("=".repeat(50));

  let passed = 0;
  let failed = 0;

  for (const test of suite.tests) {
    const success = await runTest(test.name, test.fn);
    if (success) passed++;
    else failed++;
  }

  console.log("-".repeat(50));
  console.log(`Results: ${passed}/${suite.tests.length} passed`);

  return { passed, failed, total: suite.tests.length };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
