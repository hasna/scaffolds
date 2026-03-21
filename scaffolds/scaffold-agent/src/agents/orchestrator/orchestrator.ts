/**
 * Orchestrator Agent - Layer 1
 * High-level task planning and delegation
 */

import type {
  OrchestratorConfig,
  SpecialistAgent,
  TaskPlan,
  SubTask,
} from "../types.js";
import type { AgentResult } from "../../core/types.js";
import type { AgentEvent } from "../../listeners/types.js";
import { eventBus } from "../../listeners/event-bus.js";

export class OrchestratorAgent {
  private specialists: Map<string, SpecialistAgent>;

  constructor(config: OrchestratorConfig) {
    this.specialists = new Map(Object.entries(config.specialists));
  }

  /**
   * Execute a task
   */
  async execute(task: string): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = `orch_${Date.now()}`;

    eventBus.emitEvent({
      type: "task_started",
      taskId,
      prompt: task,
    } as AgentEvent);

    try {
      // Plan the task
      const plan = await this.planTask(task);

      // Execute subtasks
      const results = await this.executeSubtasks(plan);

      // Synthesize results
      const output = await this.synthesize(task, results);

      const result: AgentResult = {
        success: true,
        output,
        metadata: {
          sessionId: taskId,
          agentId: "orchestrator",
          turnsUsed: 0,
          tokensUsed: { input: 0, output: 0, total: 0 },
          costUsd: 0,
          toolCalls: [],
          duration: Date.now() - startTime,
        },
      };

      eventBus.emitEvent({
        type: "task_completed",
        taskId,
        result,
      } as AgentEvent);

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      eventBus.emitEvent({
        type: "task_failed",
        taskId,
        error: err,
      } as AgentEvent);

      return {
        success: false,
        output: "",
        metadata: {
          sessionId: taskId,
          agentId: "orchestrator",
          turnsUsed: 0,
          tokensUsed: { input: 0, output: 0, total: 0 },
          costUsd: 0,
          toolCalls: [],
          duration: Date.now() - startTime,
        },
        error: err,
      };
    }
  }

  /**
   * Plan task execution
   */
  private async planTask(task: string): Promise<TaskPlan> {
    // Simple task analysis - in production, use Claude to generate plan
    const plan: TaskPlan = {
      id: `plan_${Date.now()}`,
      description: task,
      subtasks: [],
      dependencies: new Map(),
    };

    // Analyze task keywords to determine routing
    const taskLower = task.toLowerCase();

    if (this.shouldDelegateToCode(taskLower)) {
      plan.subtasks.push({
        id: "code_1",
        type: "specialist",
        target: "code",
        instruction: task,
        dependencies: [],
        status: "pending",
      });
    }

    if (this.shouldDelegateToResearch(taskLower)) {
      plan.subtasks.push({
        id: "research_1",
        type: "specialist",
        target: "research",
        instruction: task,
        dependencies: [],
        status: "pending",
      });
    }

    if (this.shouldDelegateToSecurity(taskLower)) {
      plan.subtasks.push({
        id: "security_1",
        type: "specialist",
        target: "security",
        instruction: task,
        dependencies: [],
        status: "pending",
      });
    }

    if (this.shouldDelegateToData(taskLower)) {
      plan.subtasks.push({
        id: "data_1",
        type: "specialist",
        target: "data",
        instruction: task,
        dependencies: [],
        status: "pending",
      });
    }

    // If no specialists match, create a general task
    if (plan.subtasks.length === 0) {
      plan.subtasks.push({
        id: "general_1",
        type: "specialist",
        target: "code",
        instruction: task,
        dependencies: [],
        status: "pending",
      });
    }

    return plan;
  }

  /**
   * Execute subtasks
   */
  private async executeSubtasks(
    plan: TaskPlan
  ): Promise<Map<string, AgentResult>> {
    const results = new Map<string, AgentResult>();

    // Group subtasks by dependencies
    const independent = plan.subtasks.filter((t) => t.dependencies.length === 0);
    const dependent = plan.subtasks.filter((t) => t.dependencies.length > 0);

    // Execute independent tasks in parallel
    const independentResults = await Promise.all(
      independent.map(async (subtask) => {
        const result = await this.executeSubtask(subtask);
        return { id: subtask.id, result };
      })
    );

    for (const { id, result } of independentResults) {
      results.set(id, result);
    }

    // Execute dependent tasks sequentially
    for (const subtask of dependent) {
      // Check if dependencies are met
      const depsComplete = subtask.dependencies.every(
        (dep) => results.has(dep) && results.get(dep)?.success
      );

      if (depsComplete) {
        const result = await this.executeSubtask(subtask);
        results.set(subtask.id, result);
      }
    }

    return results;
  }

  /**
   * Execute a single subtask
   */
  private async executeSubtask(subtask: SubTask): Promise<AgentResult> {
    subtask.status = "in_progress";

    const specialist = this.specialists.get(subtask.target);
    if (!specialist) {
      subtask.status = "failed";
      return {
        success: false,
        output: `No specialist found for: ${subtask.target}`,
        metadata: {
          sessionId: "",
          agentId: subtask.target,
          turnsUsed: 0,
          tokensUsed: { input: 0, output: 0, total: 0 },
          costUsd: 0,
          toolCalls: [],
          duration: 0,
        },
      };
    }

    eventBus.emitEvent({
      type: "subagent_spawned",
      agentId: subtask.id,
      purpose: subtask.instruction,
    } as AgentEvent);

    try {
      const result = await specialist.execute(subtask.instruction);
      subtask.status = result.success ? "completed" : "failed";
      subtask.result = result;

      eventBus.emitEvent({
        type: "subagent_completed",
        agentId: subtask.id,
        result,
      } as AgentEvent);

      return result;
    } catch (error) {
      subtask.status = "failed";
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        output: "",
        metadata: {
          sessionId: "",
          agentId: subtask.target,
          turnsUsed: 0,
          tokensUsed: { input: 0, output: 0, total: 0 },
          costUsd: 0,
          toolCalls: [],
          duration: 0,
        },
        error: err,
      };
    }
  }

  /**
   * Synthesize results
   */
  private async synthesize(
    _originalTask: string,
    results: Map<string, AgentResult>
  ): Promise<string> {
    const outputs: string[] = [];

    for (const [id, result] of results) {
      if (result.success && result.output) {
        outputs.push(`[${id}]: ${result.output}`);
      } else if (result.error) {
        outputs.push(`[${id}]: Error - ${result.error.message}`);
      }
    }

    if (outputs.length === 1) {
      return outputs[0].replace(/^\[.*?\]: /, "");
    }

    return outputs.join("\n\n");
  }

  // Routing helpers
  private shouldDelegateToCode(task: string): boolean {
    const keywords = [
      "code",
      "function",
      "refactor",
      "debug",
      "implement",
      "fix",
      "bug",
      "error",
      "compile",
      "build",
      "test",
      "lint",
    ];
    return keywords.some((k) => task.includes(k));
  }

  private shouldDelegateToResearch(task: string): boolean {
    const keywords = [
      "search",
      "find",
      "research",
      "documentation",
      "docs",
      "learn",
      "explain",
      "what is",
      "how to",
    ];
    return keywords.some((k) => task.includes(k));
  }

  private shouldDelegateToSecurity(task: string): boolean {
    const keywords = [
      "security",
      "vulnerability",
      "audit",
      "penetration",
      "exploit",
      "cve",
      "owasp",
      "injection",
      "xss",
    ];
    return keywords.some((k) => task.includes(k));
  }

  private shouldDelegateToData(task: string): boolean {
    const keywords = [
      "data",
      "analyze",
      "transform",
      "csv",
      "json",
      "database",
      "query",
      "aggregate",
      "statistics",
    ];
    return keywords.some((k) => task.includes(k));
  }

  /**
   * Register a specialist
   */
  registerSpecialist(name: string, specialist: SpecialistAgent): void {
    this.specialists.set(name, specialist);
  }

  /**
   * Get registered specialists
   */
  getSpecialists(): string[] {
    return Array.from(this.specialists.keys());
  }
}
