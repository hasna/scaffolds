# Worker Agents

## Overview

Worker Agents are Layer 3 agents designed for atomic, stateless task execution. They are lightweight, single-purpose agents that spin up quickly and handle specific operations.

## Characteristics

- **Stateless**: No persistent state between executions
- **Single-purpose**: Handle one type of operation
- **Fast**: Quick spin-up and teardown
- **Limited tools**: Only the tools needed for their task

## Available Workers

### File Worker

Handles atomic file operations.

**Operations**:
- `read`: Read file contents
- `write`: Create or overwrite files
- `edit`: Modify specific parts of files

**Usage**:
```typescript
import { FileWorker } from "./agents/workers";

const result = await FileWorker.run({
  type: "file",
  operation: "write",
  path: "output.txt",
  content: "Hello, World!",
  instruction: "Write content to file",
});
```

### Search Worker

Handles atomic search operations.

**Operations**:
- `files`: Find files by pattern (Glob)
- `content`: Search file contents (Grep)

**Usage**:
```typescript
import { SearchWorker } from "./agents/workers";

const result = await SearchWorker.run({
  type: "search",
  searchType: "content",
  pattern: "TODO",
  path: "src/",
  instruction: "Find all TODOs",
});
```

### Transform Worker

Handles atomic data transformation operations.

**Operations**:
- `json`: Transform JSON data
- `csv`: Transform CSV data
- `text`: Transform text data
- `code`: Transform code

**Usage**:
```typescript
import { TransformWorker } from "./agents/workers";

const result = await TransformWorker.run({
  type: "transform",
  transformationType: "json",
  input: '{"name": "test"}',
  transformation: "Add an 'id' field with value 1",
  instruction: "Transform JSON",
});
```

## Worker Pool

For concurrent worker execution, use the WorkerPool:

```typescript
import { WorkerPool } from "./agents/workers";

const pool = new WorkerPool(5); // Max 5 concurrent workers

const tasks = [
  { type: "file", operation: "read", path: "a.txt", instruction: "..." },
  { type: "file", operation: "read", path: "b.txt", instruction: "..." },
  { type: "file", operation: "read", path: "c.txt", instruction: "..." },
];

const results = await pool.submitAll(tasks);
```
