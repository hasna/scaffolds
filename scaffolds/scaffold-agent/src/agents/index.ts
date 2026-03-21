/**
 * Agents module exports
 */

export * from "./types.js";

// Orchestrator
export { OrchestratorAgent } from "./orchestrator/orchestrator.js";
export {
  ORCHESTRATOR_SYSTEM_PROMPT,
  TASK_PLANNING_PROMPT,
  RESULT_SYNTHESIS_PROMPT,
} from "./orchestrator/prompts.js";

// Specialists
export {
  BaseSpecialist,
  CodeSpecialist,
  ResearchSpecialist,
  DataSpecialist,
  SecuritySpecialist,
  createSpecialist,
  createAllSpecialists,
} from "./specialists/index.js";

// Workers
export {
  BaseWorker,
  FileWorker,
  SearchWorker,
  TransformWorker,
  WorkerPool,
} from "./workers/index.js";
export type { FileTask, SearchTask, TransformTask } from "./workers/index.js";
