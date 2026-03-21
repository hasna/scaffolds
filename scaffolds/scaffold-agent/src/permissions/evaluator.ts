/**
 * Permission evaluator for tool access control
 */

import { minimatch } from "minimatch";
import type { PermissionPolicy, PermissionRule } from "./policy.js";

export interface PermissionResult {
  action: "allow" | "deny" | "ask";
  reason: string;
  matchedRule?: PermissionRule;
}

export class PermissionEvaluator {
  private policy: PermissionPolicy;

  constructor(policy: PermissionPolicy) {
    this.policy = policy;
  }

  /**
   * Evaluate permission for a tool call
   */
  async evaluate(
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<PermissionResult> {
    // Sort rules by priority (descending)
    const sortedRules = [...this.policy.rules].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    // Find first matching rule
    for (const rule of sortedRules) {
      if (this.ruleMatchesTool(rule, toolName)) {
        const conditionMatch = await this.checkConditions(rule, toolInput);
        if (conditionMatch.matches) {
          return {
            action: rule.action,
            reason: conditionMatch.reason || `Matched rule: ${rule.tool} -> ${rule.action}`,
            matchedRule: rule,
          };
        }
      }
    }

    // Default allow if no rules match
    return {
      action: "allow",
      reason: "No matching rule found, default allow",
    };
  }

  /**
   * Check if a rule matches the tool
   */
  private ruleMatchesTool(rule: PermissionRule, toolName: string): boolean {
    return rule.tool === "*" || rule.tool === toolName;
  }

  /**
   * Check if conditions are met
   */
  private async checkConditions(
    rule: PermissionRule,
    input: Record<string, unknown>
  ): Promise<{ matches: boolean; reason?: string }> {
    // No conditions means always match
    if (!rule.conditions) {
      return { matches: true };
    }

    const { pathPatterns, commandPatterns, urlPatterns, timeRestriction } =
      rule.conditions;

    // Check path patterns
    if (pathPatterns) {
      const filePath = String(input.file_path || input.path || "");
      if (filePath) {
        const pathMatch = this.checkPatterns(filePath, pathPatterns);
        if (!pathMatch.matches) {
          return { matches: false };
        }
        if (pathMatch.reason) {
          return { matches: true, reason: pathMatch.reason };
        }
      }
    }

    // Check command patterns
    if (commandPatterns) {
      const command = String(input.command || "");
      if (command) {
        const cmdMatch = this.checkPatterns(command, commandPatterns);
        if (!cmdMatch.matches) {
          return { matches: false };
        }
        if (cmdMatch.reason) {
          return { matches: true, reason: cmdMatch.reason };
        }
      }
    }

    // Check URL patterns
    if (urlPatterns) {
      const url = String(input.url || "");
      if (url) {
        const urlMatch = this.checkPatterns(url, urlPatterns);
        if (!urlMatch.matches) {
          return { matches: false };
        }
        if (urlMatch.reason) {
          return { matches: true, reason: urlMatch.reason };
        }
      }
    }

    // Check time restriction
    if (timeRestriction) {
      const timeMatch = this.checkTimeRestriction(timeRestriction);
      if (!timeMatch.matches) {
        return timeMatch;
      }
    }

    return { matches: true };
  }

  /**
   * Check patterns (glob or string matching)
   */
  private checkPatterns(
    value: string,
    patterns: string[]
  ): { matches: boolean; reason?: string } {
    for (const pattern of patterns) {
      const isNegation = pattern.startsWith("!");
      const actualPattern = isNegation ? pattern.slice(1) : pattern;

      let matches: boolean;

      // Use minimatch for glob patterns
      if (actualPattern.includes("*") || actualPattern.includes("?")) {
        matches = minimatch(value, actualPattern, { dot: true });
      } else {
        // Simple substring match for non-glob patterns
        matches = value.includes(actualPattern);
      }

      // If negation pattern matches, rule doesn't apply
      if (isNegation && matches) {
        return { matches: false };
      }

      // If non-negation pattern matches, rule applies
      if (!isNegation && matches) {
        return {
          matches: true,
          reason: `Pattern matched: ${actualPattern}`,
        };
      }
    }

    // If we only have negation patterns and none matched, rule applies
    const hasOnlyNegations = patterns.every((p) => p.startsWith("!"));
    if (hasOnlyNegations) {
      return { matches: true };
    }

    // No patterns matched
    return { matches: false };
  }

  /**
   * Check time restriction
   */
  private checkTimeRestriction(restriction: {
    start: string;
    end: string;
    timezone?: string;
  }): { matches: boolean; reason?: string } {
    const now = new Date();

    // Parse time strings (HH:MM format)
    const [startHour, startMin] = restriction.start.split(":").map(Number);
    const [endHour, endMin] = restriction.end.split(":").map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const isWithinTime =
      currentMinutes >= startMinutes && currentMinutes <= endMinutes;

    if (!isWithinTime) {
      return {
        matches: false,
        reason: `Outside allowed time window (${restriction.start}-${restriction.end})`,
      };
    }

    return { matches: true };
  }

  /**
   * Get the current policy
   */
  getPolicy(): PermissionPolicy {
    return this.policy;
  }

  /**
   * Update the policy
   */
  setPolicy(policy: PermissionPolicy): void {
    this.policy = policy;
  }

  /**
   * Add a rule to the policy
   */
  addRule(rule: PermissionRule): void {
    this.policy.rules.push(rule);
  }

  /**
   * Remove rules for a specific tool
   */
  removeRulesForTool(toolName: string): void {
    this.policy.rules = this.policy.rules.filter(
      (rule) => rule.tool !== toolName
    );
  }
}
