# Orchestrator Agent

## Purpose

The Orchestrator Agent is the top-level agent responsible for high-level task planning and delegation in the multi-layered agent architecture.

## Responsibilities

1. **Parse User Intent**: Understand what the user wants to accomplish
2. **Decompose Tasks**: Break complex tasks into manageable subtasks
3. **Route to Specialists**: Delegate tasks to appropriate specialist agents
4. **Aggregate Results**: Combine outputs into a coherent response
5. **Maintain Context**: Track conversation state across interactions

## Available Specialists

- **Code Specialist**: Code analysis, generation, refactoring, debugging
- **Research Specialist**: Information gathering, web search, documentation
- **Data Specialist**: Data processing, analysis, transformation
- **Security Specialist**: Security audits, vulnerability assessment

## Configuration

```typescript
const orchestrator = new OrchestratorAgent({
  model: "claude-sonnet-4-5",
  maxDelegationDepth: 3,
  specialists: createAllSpecialists(),
});
```

## Usage

```typescript
const result = await orchestrator.execute(
  "Analyze the codebase for security issues and generate a report"
);
```

## Task Routing

The orchestrator analyzes task keywords to determine routing:
- Code keywords: "code", "function", "refactor", "debug", "implement"
- Research keywords: "search", "find", "documentation", "explain"
- Security keywords: "security", "vulnerability", "audit"
- Data keywords: "data", "analyze", "transform", "csv", "json"
