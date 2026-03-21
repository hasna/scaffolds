/**
 * Scaffold Agent - Multi-layered Agentic System
 *
 * A production-ready architecture for building sophisticated
 * multi-layered AI agent systems using the Claude Agent SDK.
 */

// Core exports
export {
  AgentSystem,
  createAgentSystem,
  defaultConfig,
  mergeConfig,
  validateConfig,
  getEnvironmentConfig,
  telemetry,
  createTelemetry,
} from "./core/index.js";

export type {
  AgentConfig,
  AgentResult,
  AgentResultMetadata,
  ModelName,
  PermissionMode,
  ToolsConfig,
  HooksConfig,
  SkillsConfig,
  ListenersConfig,
  AgentsConfig,
  SpecialistType,
  ToolCallRecord,
  HookEvent,
  HookContext,
  HookInput,
  HookOutput,
  HookFunction,
  ToolDefinition,
  ToolResult,
  ToolResultContent,
  PermissionPolicy,
  PermissionRule,
  PermissionConditions,
  AgentEvent,
  Listener,
  Skill,
  SkillMetadata,
  AgentSystemOptions,
} from "./core/index.js";

// Tools exports
export {
  ToolRegistry,
  tool,
  textResult,
  jsonResult,
  toolRegistry,
  customTools,
  registerCustomTools,
} from "./tools/index.js";

// Hooks exports
export {
  securityValidationHook,
  rateLimitHook,
  resetRateLimits,
  getRateLimitStatus,
  telemetryHook,
  performanceHook,
  createHookMatcher,
  createHooksConfig,
  HookExecutor,
  hookExecutor,
} from "./hooks/index.js";

export type { HookMatcher, HooksConfig as HooksConfigType } from "./hooks/index.js";

// Listeners exports
export {
  AgentEventBus,
  eventBus,
  ProgressListener,
  ConsoleProgressListener,
  BudgetListener,
} from "./listeners/index.js";

export type {
  AgentEventType,
  ListenerOptions,
  ProgressMessage,
  BudgetStatus,
  BudgetListenerOptions,
} from "./listeners/index.js";

// Permissions exports
export {
  defaultPolicy,
  strictPolicy,
  permissivePolicy,
  getPolicy,
  PermissionEvaluator,
} from "./permissions/index.js";

export type { PermissionResult } from "./permissions/index.js";

// Skills exports
export { SkillLoader, skillLoader } from "./skills/index.js";

// Agents exports
export {
  OrchestratorAgent,
  ORCHESTRATOR_SYSTEM_PROMPT,
  TASK_PLANNING_PROMPT,
  RESULT_SYNTHESIS_PROMPT,
  BaseSpecialist,
  CodeSpecialist,
  ResearchSpecialist,
  DataSpecialist,
  SecuritySpecialist,
  createSpecialist,
  createAllSpecialists,
  BaseWorker,
  FileWorker,
  SearchWorker,
  TransformWorker,
  WorkerPool,
} from "./agents/index.js";

export type {
  BaseAgentConfig,
  OrchestratorConfig,
  SpecialistConfig,
  WorkerConfig,
  SpecialistDomain,
  WorkerTask,
  SpecialistAgent,
  TaskPlan,
  SubTask,
  DelegationResult,
  AnalysisResult,
  Issue,
  RefactorResult,
  Change,
  FileTask,
  SearchTask,
  TransformTask,
} from "./agents/index.js";

/**
 * Quick start helper - creates and initializes a complete agent system
 */
export async function createSystem(
  config?: Partial<import("./core/types.js").AgentConfig>
): Promise<import("./core/system.js").AgentSystem> {
  const { AgentSystem } = await import("./core/system.js");
  const system = new AgentSystem({ config });
  await system.initialize();
  return system;
}

/**
 * Quick start helper - creates orchestrator with all specialists
 * Note: use createSystem() for a fully initialized agent system instead.
 */
export async function createOrchestrator(
  config?: Partial<import("./agents/types.js").OrchestratorConfig>
): Promise<import("./agents/orchestrator/orchestrator.js").OrchestratorAgent> {
  const { OrchestratorAgent } = await import("./agents/orchestrator/orchestrator.js");
  const { createAllSpecialists } = await import("./agents/specialists/index.js");

  return new OrchestratorAgent({
    maxDelegationDepth: 3,
    specialists: createAllSpecialists(),
    ...config,
  });
}
