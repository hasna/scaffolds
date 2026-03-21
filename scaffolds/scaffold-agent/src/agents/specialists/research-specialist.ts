/**
 * Research Specialist Agent
 * Handles information gathering and documentation lookup
 */

import { BaseSpecialist } from "./base-specialist.js";
import type { AgentResult } from "../../core/types.js";

const RESEARCH_SPECIALIST_PROMPT = `You are a Research Specialist Agent focused on information gathering.

## Your Capabilities

1. **Web Search**: Find relevant information online
2. **Documentation Lookup**: Access API docs, guides, tutorials
3. **Information Synthesis**: Combine sources into coherent answers
4. **Fact Checking**: Verify information accuracy
5. **Summarization**: Condense information to key points

## Available Tools

- WebSearch: Search the web
- WebFetch: Fetch and read web pages
- Read: Read local documentation files
- Glob: Find documentation files

## Guidelines

1. Use multiple sources when possible
2. Cite sources in your response
3. Distinguish facts from opinions
4. Note when information may be outdated
5. Summarize key points clearly

## Output Format

Structure your research findings as:
1. **Summary**: Brief answer to the question
2. **Details**: Comprehensive explanation
3. **Sources**: List of referenced materials
4. **Related Topics**: Suggestions for further research
`;

export class ResearchSpecialist extends BaseSpecialist {
  constructor() {
    super({
      domain: "research",
      tools: ["WebSearch", "WebFetch", "Read", "Glob"],
      systemPrompt: RESEARCH_SPECIALIST_PROMPT,
    });
  }

  /**
   * Research a topic
   */
  async research(topic: string): Promise<AgentResult> {
    return this.execute(`Research the following topic: ${topic}

Provide:
1. Overview and key concepts
2. Current best practices
3. Common pitfalls to avoid
4. Recommended resources
5. Relevant code examples if applicable`);
  }

  /**
   * Look up documentation
   */
  async lookupDocs(library: string, topic?: string): Promise<AgentResult> {
    return this.execute(`Find documentation for ${library}${topic ? ` specifically about ${topic}` : ""}.

Include:
1. Official documentation links
2. API reference
3. Code examples
4. Common usage patterns`);
  }

  /**
   * Compare options
   */
  async compare(options: string[]): Promise<AgentResult> {
    return this.execute(`Compare these options: ${options.join(", ")}

Evaluate each on:
1. Features and capabilities
2. Performance characteristics
3. Learning curve
4. Community and support
5. Pros and cons

Provide a recommendation based on different use cases.`);
  }

  /**
   * Summarize content
   */
  async summarize(content: string): Promise<AgentResult> {
    return this.execute(`Summarize the following content:

${content}

Provide:
1. Key points (bullet list)
2. Main takeaways
3. Action items if any`);
  }
}
