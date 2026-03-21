/**
 * Agent type definitions
 */

import type { AgentResult, ModelName } from "../core/types.js";

export interface BaseAgentConfig {
  model?: ModelName;
  maxTurns?: number;
  systemPrompt?: string;
}

export interface OrchestratorConfig extends BaseAgentConfig {
  specialists: Record<string, SpecialistAgent>;
  maxDelegationDepth: number;
  contextWindow?: number;
}

export interface SpecialistConfig extends BaseAgentConfig {
  domain: SpecialistDomain;
  tools: string[];
}

export interface WorkerConfig extends BaseAgentConfig {
  task: WorkerTask;
  timeout?: number;
}

export type SpecialistDomain = "code" | "research" | "data" | "security";

export interface WorkerTask {
  type: "file" | "search" | "transform" | "validate";
  instruction: string;
  input?: unknown;
}

export interface SpecialistAgent {
  domain: SpecialistDomain;
  execute(task: string): Promise<AgentResult>;
}

export interface TaskPlan {
  id: string;
  description: string;
  subtasks: SubTask[];
  dependencies: Map<string, string[]>;
}

export interface SubTask {
  id: string;
  type: "specialist" | "worker";
  target: SpecialistDomain | string;
  instruction: string;
  dependencies: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: AgentResult;
}

export interface DelegationResult {
  taskId: string;
  subtaskResults: Map<string, AgentResult>;
  aggregatedOutput: string;
  success: boolean;
  error?: Error;
}

export interface AnalysisResult {
  files: string[];
  issues: Issue[];
  metrics: Record<string, number>;
}

export interface Issue {
  file: string;
  line?: number;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestion?: string;
}

export interface RefactorResult {
  filesModified: string[];
  changes: Change[];
  success: boolean;
  error?: string;
}

export interface Change {
  file: string;
  type: "create" | "modify" | "delete";
  description: string;
}
