/**
 * Budget listener for cost tracking and limits
 */

import type { AgentEvent, AgentEventType, Listener } from "./types.js";

export interface BudgetStatus {
  totalSpent: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  warningIssued: boolean;
  limitReached: boolean;
}

export interface BudgetListenerOptions {
  limit: number;
  warningThreshold?: number; // 0-1, default 0.8
  onWarning?: (status: BudgetStatus) => void;
  onLimitReached?: (status: BudgetStatus) => void;
}

// Approximate costs per 1K tokens (as of late 2024)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 0.003, output: 0.015 },
  "claude-opus-4-5": { input: 0.015, output: 0.075 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku": { input: 0.001, output: 0.005 },
};

export class BudgetListener implements Listener {
  name = "budget-listener";
  events: AgentEventType[] = ["budget_warning", "tool_called", "task_completed"];

  private totalSpent = 0;
  private limit: number;
  private warningThreshold: number;
  private warningIssued = false;
  private limitReached = false;
  private onWarning?: (status: BudgetStatus) => void;
  private onLimitReached?: (status: BudgetStatus) => void;

  constructor(options: BudgetListenerOptions) {
    this.limit = options.limit;
    this.warningThreshold = options.warningThreshold ?? 0.8;
    this.onWarning = options.onWarning;
    this.onLimitReached = options.onLimitReached;
  }

  async handler(event: AgentEvent): Promise<void> {
    if (event.type === "budget_warning") {
      this.totalSpent = event.spent;
      this.checkThresholds();
    }
  }

  /**
   * Add cost to the total
   */
  addCost(cost: number): void {
    this.totalSpent += cost;
    this.checkThresholds();
  }

  /**
   * Estimate cost for token usage
   */
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costs = MODEL_COSTS[model] || MODEL_COSTS["claude-sonnet-4-5"];
    return (
      (inputTokens / 1000) * costs.input +
      (outputTokens / 1000) * costs.output
    );
  }

  /**
   * Add cost from token usage
   */
  addTokenUsage(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    const cost = this.estimateCost(model, inputTokens, outputTokens);
    this.addCost(cost);
  }

  private checkThresholds(): void {
    const status = this.getStatus();

    // Check warning threshold
    if (!this.warningIssued && status.percentUsed >= this.warningThreshold * 100) {
      this.warningIssued = true;
      console.warn(
        `Budget warning: ${status.percentUsed.toFixed(1)}% used ($${status.totalSpent.toFixed(4)} of $${status.limit})`
      );
      this.onWarning?.(status);
    }

    // Check limit
    if (!this.limitReached && this.totalSpent >= this.limit) {
      this.limitReached = true;
      console.error(
        `Budget limit reached: $${status.totalSpent.toFixed(4)} of $${status.limit}`
      );
      this.onLimitReached?.(status);
    }
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    return {
      totalSpent: this.totalSpent,
      limit: this.limit,
      remaining: Math.max(0, this.limit - this.totalSpent),
      percentUsed: (this.totalSpent / this.limit) * 100,
      warningIssued: this.warningIssued,
      limitReached: this.limitReached,
    };
  }

  /**
   * Check if within budget
   */
  isWithinBudget(): boolean {
    return this.totalSpent < this.limit;
  }

  /**
   * Reset the budget tracker
   */
  reset(): void {
    this.totalSpent = 0;
    this.warningIssued = false;
    this.limitReached = false;
  }

  /**
   * Update the limit
   */
  setLimit(newLimit: number): void {
    this.limit = newLimit;
    // Re-check thresholds with new limit
    this.warningIssued = false;
    this.limitReached = false;
    this.checkThresholds();
  }
}
