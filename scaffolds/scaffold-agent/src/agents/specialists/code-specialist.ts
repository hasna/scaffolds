/**
 * Code Specialist Agent
 * Handles code analysis, generation, and refactoring
 */

import { BaseSpecialist } from "./base-specialist.js";
import type { AnalysisResult, RefactorResult } from "../types.js";
import type { AgentResult } from "../../core/types.js";

const CODE_SPECIALIST_PROMPT = `You are a Code Specialist Agent with expertise in software development.

## Your Capabilities

1. **Code Analysis**: Understand and explain code, identify patterns and issues
2. **Code Generation**: Write new code following best practices
3. **Refactoring**: Improve code structure without changing behavior
4. **Debugging**: Find and fix bugs, trace issues
5. **Testing**: Write and improve tests

## Available Tools

- Read: Read file contents
- Write: Create new files
- Edit: Modify existing files
- Glob: Find files by pattern
- Grep: Search file contents
- Bash: Run commands (build, test, lint)

## Guidelines

1. Always read existing code before modifying
2. Maintain consistent style with existing codebase
3. Write clean, documented code
4. Consider edge cases and error handling
5. Prefer small, focused changes

## Output Format

For code analysis, provide:
- Summary of findings
- Specific issues with file:line references
- Suggested improvements

For code generation, provide:
- Clear explanation of approach
- Well-commented code
- Usage examples if appropriate
`;

export class CodeSpecialist extends BaseSpecialist {
  constructor() {
    super({
      domain: "code",
      tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
      systemPrompt: CODE_SPECIALIST_PROMPT,
    });
  }

  /**
   * Analyze a codebase or file
   */
  async analyze(target: string): Promise<AnalysisResult> {
    await this.execute(`Analyze the code at ${target}. Identify:
1. Code structure and architecture
2. Potential issues or bugs
3. Performance concerns
4. Security vulnerabilities
5. Code quality metrics

Provide a detailed analysis with specific file and line references.`);

    // Parse result into structured format
    return {
      files: [],
      issues: [],
      metrics: {},
    };
  }

  /**
   * Refactor code
   */
  async refactor(target: string, instructions: string): Promise<RefactorResult> {
    const result = await this.execute(`Refactor the code at ${target}:

Instructions: ${instructions}

Requirements:
1. Maintain existing functionality
2. Improve code quality
3. Follow project conventions
4. Add appropriate comments`);

    return {
      filesModified: [],
      changes: [],
      success: result.success,
      error: result.error?.message,
    };
  }

  /**
   * Generate code
   */
  async generate(specification: string): Promise<AgentResult> {
    return this.execute(`Generate code based on this specification:

${specification}

Requirements:
1. Follow best practices
2. Include error handling
3. Add documentation
4. Provide usage examples`);
  }

  /**
   * Debug an issue
   */
  async debug(issue: string, context?: string): Promise<AgentResult> {
    const prompt = context
      ? `Debug this issue: ${issue}\n\nContext:\n${context}`
      : `Debug this issue: ${issue}`;

    return this.execute(`${prompt}

Steps:
1. Understand the expected vs actual behavior
2. Identify potential causes
3. Trace the issue through the code
4. Propose and implement a fix
5. Verify the fix works`);
  }
}
