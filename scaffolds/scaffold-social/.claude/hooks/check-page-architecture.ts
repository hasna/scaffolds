#!/usr/bin/env bun
/**
 * Claude Code Hook: Check Page Architecture
 *
 * POST-TOOL HOOK for Write/Edit operations on page files.
 * Uses AI (OpenAI) to review page architecture and provide feedback:
 *
 * - Detects hardcoded page titles/descriptions that should be in components
 * - Checks if code should be extracted into reusable components
 * - Ensures pages follow proper patterns (title in <header>, no inline descriptions)
 * - Reviews git diff to see what was changed
 *
 * Provides actionable feedback to the AI to fix architectural issues.
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");

interface HookInput {
  session_id: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    new_string?: string;
  };
}

interface HookOutput {
  decision: "approve" | "block";
  reason?: string;
}

interface ArchitectureIssue {
  type:
    | "hardcoded_content"
    | "missing_component"
    | "inline_styles"
    | "no_header"
    | "description_in_page";
  description: string;
  suggestion: string;
  line?: number;
}

function output(result: HookOutput): void {
  const json = JSON.stringify(result);
  process.stdout.write(json + "\n");
}

function findProjectRoot(inputCwd?: string): string {
  const possiblePaths = [
    inputCwd,
    PROJECT_ROOT,
    "/Users/hasna/Workspace/dev/hasnaxyz/scaffold/scaffolddev/scaffold-social",
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (existsSync(join(p, "package.json"))) {
      return p;
    }
  }
  return PROJECT_ROOT;
}

function isPageFile(filePath: string): boolean {
  // Check if this is a page file (Next.js app router)
  const pagePatterns = [
    /\/app\/.*\/page\.tsx$/,
    /\/app\/.*\/page\.ts$/,
    /\/pages\/.*\.tsx$/,
    /\/pages\/.*\.ts$/,
  ];
  return pagePatterns.some((pattern) => pattern.test(filePath));
}

function detectArchitectureIssues(content: string, filePath: string): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const lines = content.split("\n");

  // Check for hardcoded page title/description patterns
  const hardcodedTitlePatterns = [
    /<h1[^>]*>(?!.*\{)([^<]+)<\/h1>/gi,
    /<title>(?!.*\{)([^<]+)<\/title>/gi,
    /className=".*text-2xl.*font-bold.*"[^>]*>(?!.*\{)([^<]+)</gi,
  ];

  const hardcodedDescriptionPatterns = [
    /<p[^>]*className="[^"]*text-muted-foreground[^"]*"[^>]*>(?!.*\{)[^<]{20,}<\/p>/gi,
    /<p[^>]*>(?!.*\{)[^<]{50,}<\/p>/gi,
    /description\s*[:=]\s*["'][^"']{30,}["']/gi,
  ];

  // Check for inline content that should be components
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect hardcoded titles
    if (/<h1[^>]*>[^{<]+<\/h1>/.test(line) && !line.includes("{")) {
      issues.push({
        type: "hardcoded_content",
        description: `Line ${lineNum}: Hardcoded <h1> title found`,
        suggestion: "Move page title to metadata export or use a PageHeader component",
        line: lineNum,
      });
    }

    // Detect hardcoded descriptions in page body
    if (/<p[^>]*>[^{<]{40,}<\/p>/.test(line) && !line.includes("{")) {
      issues.push({
        type: "description_in_page",
        description: `Line ${lineNum}: Long hardcoded description in page body`,
        suggestion:
          "Descriptions should be in metadata, not rendered in page. Use PageHeader component if needed.",
        line: lineNum,
      });
    }

    // Detect inline page header patterns that should use PageHeader component
    if (
      /className="[^"]*space-y-[12][^"]*"/.test(line) &&
      (lines[i + 1]?.includes("<h1") || lines[i + 1]?.includes("<h2"))
    ) {
      issues.push({
        type: "missing_component",
        description: `Line ${lineNum}: Inline page header structure detected`,
        suggestion:
          "Use the PageHeader component from @/components/page-header instead of inline header structure",
        line: lineNum,
      });
    }

    // Detect repeated card patterns that should be components
    if (/<Card/.test(line)) {
      const cardCount = (content.match(/<Card/g) || []).length;
      if (cardCount > 3 && !filePath.includes("components")) {
        issues.push({
          type: "missing_component",
          description: `Multiple Card components (${cardCount}) in single page`,
          suggestion: "Consider extracting repeated card patterns into reusable components",
        });
        break; // Only report once
      }
    }
  }

  // Check if page has proper structure
  if (!content.includes("export const metadata") && !content.includes("generateMetadata")) {
    issues.push({
      type: "no_header",
      description: "Page missing metadata export",
      suggestion: 'Add \'export const metadata = { title: "...", description: "..." }\' for SEO',
    });
  }

  return issues;
}

async function getAIReview(
  content: string,
  filePath: string,
  gitDiff: string,
  existingComponents: string[]
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `You are a senior React/Next.js architect reviewing page code for architectural issues.

## File Being Reviewed
Path: ${filePath}

## Git Diff (what changed)
\`\`\`diff
${gitDiff.slice(0, 2000)}
\`\`\`

## Current File Content
\`\`\`tsx
${content.slice(0, 4000)}
\`\`\`

## Available Components in Project
${existingComponents
  .slice(0, 20)
  .map((c) => `- ${c}`)
  .join("\n")}

## Review Guidelines
1. Pages should NOT have hardcoded page titles/descriptions in the body
2. Page title should ONLY be in metadata export or a <header> component
3. Descriptions belong in metadata, not rendered in the page body
4. Repeated patterns (3+ similar elements) should be extracted to components
5. Use existing components from the project when available
6. Follow DRY principle - don't repeat code that could be a component

## Your Task
Analyze the code and provide:
1. Any architectural issues found (be specific with line numbers)
2. Concrete suggestions to fix each issue
3. Which existing components could be used instead

Keep your response concise (max 300 words). Focus only on significant issues.
If the code looks good, just say "Architecture looks good."`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a code architecture reviewer. Be concise and actionable.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`[check-page-architecture] OpenAI API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("[check-page-architecture] AI review error:", error);
    return null;
  }
}

function getGitDiff(filePath: string, cwd: string): string {
  try {
    // Get staged diff first, then unstaged
    const stagedDiff = execSync(`git diff --cached -- "${filePath}" 2>/dev/null || true`, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });

    const unstagedDiff = execSync(`git diff -- "${filePath}" 2>/dev/null || true`, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });

    return stagedDiff + unstagedDiff;
  } catch {
    return "";
  }
}

function getExistingComponents(cwd: string): string[] {
  try {
    const result = execSync(
      `find "${cwd}/apps/web/src/components" -name "*.tsx" -type f 2>/dev/null | head -30`,
      { cwd, encoding: "utf-8" }
    );
    return result
      .split("\n")
      .filter(Boolean)
      .map((p) => basename(p, ".tsx"));
  } catch {
    return [];
  }
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    let hookInput: HookInput;

    try {
      hookInput = JSON.parse(input);
    } catch {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Only check Write and Edit tools
    const toolName = hookInput.tool_name?.toLowerCase() || "";
    if (!toolName.includes("write") && !toolName.includes("edit")) {
      output({ decision: "approve" });
      process.exit(0);
    }

    const filePath = hookInput.tool_input?.file_path || "";

    // Only check page files
    if (!isPageFile(filePath)) {
      output({ decision: "approve" });
      process.exit(0);
    }

    // Get the content
    const content = hookInput.tool_input?.content || hookInput.tool_input?.new_string || "";

    if (!content || content.length < 50) {
      output({ decision: "approve" });
      process.exit(0);
    }

    const cwd = findProjectRoot();

    // Quick static analysis
    const staticIssues = detectArchitectureIssues(content, filePath);

    // Get git diff and existing components for AI review
    const gitDiff = getGitDiff(filePath, cwd);
    const existingComponents = getExistingComponents(cwd);

    // Get AI review if we have API key and there are potential issues
    let aiReview: string | null = null;
    if (staticIssues.length > 0 || content.length > 500) {
      aiReview = await getAIReview(content, filePath, gitDiff, existingComponents);
    }

    // Determine if we should block
    const hasSignificantIssues = staticIssues.some(
      (i) => i.type === "hardcoded_content" || i.type === "description_in_page"
    );

    if (hasSignificantIssues || (aiReview && !aiReview.toLowerCase().includes("looks good"))) {
      const staticIssuesText =
        staticIssues.length > 0
          ? `\n\n**Static Analysis Issues:**\n${staticIssues.map((i) => `- ${i.description}\n  → ${i.suggestion}`).join("\n")}`
          : "";

      const aiReviewText = aiReview ? `\n\n**AI Architecture Review:**\n${aiReview}` : "";

      const reason = `⚠️ Page Architecture Review for: ${basename(filePath)}
${staticIssuesText}${aiReviewText}

**Key Rules:**
1. Page title should be in metadata export, NOT hardcoded in JSX
2. Descriptions belong in metadata, not rendered in page body
3. Use PageHeader component for page headers
4. Extract repeated patterns into reusable components

Please review and fix any issues before proceeding.`;

      output({
        decision: "block",
        reason: reason,
      });
      process.exit(0);
    }

    output({ decision: "approve" });
    process.exit(0);
  } catch (error) {
    // On error, approve to avoid blocking
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[check-page-architecture] Error: ${errorMsg}`);
    output({ decision: "approve" });
    process.exit(0);
  }
}

main();
