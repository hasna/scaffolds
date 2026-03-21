// Registry
export {
  SCAFFOLDS,
  CATEGORIES,
  getScaffold,
  getScaffoldsByCategory,
  searchScaffolds,
} from "./lib/registry.js";
export type { ScaffoldMeta, Category } from "./lib/registry.js";

// Installer
export {
  installScaffold,
  getInstalledScaffolds,
  scaffoldExists,
  getScaffoldsDir,
  getScaffoldSourceDir,
  replaceTemplateVars,
} from "./lib/installer.js";
export type {
  InstallOptions,
  InstallResult,
  InstalledScaffold,
} from "./lib/installer.js";

// Runner
export {
  runCommand,
  runPostInstall,
  getScaffoldReadme,
} from "./lib/runner.js";
export type { RunResult } from "./lib/runner.js";

// Setup
export { runSetup, loadEnvManifest } from "./lib/setup.js";
export type { SetupOptions, SetupResult } from "./lib/setup.js";
