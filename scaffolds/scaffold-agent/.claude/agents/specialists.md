# Specialist Agents

## Overview

Specialist Agents are Layer 2 agents with domain-specific expertise. They receive delegated tasks from the Orchestrator and execute them using focused tools and knowledge.

## Available Specialists

### Code Specialist

**Domain**: Software development

**Capabilities**:
- Code analysis and understanding
- Code generation
- Refactoring
- Debugging
- Testing

**Tools**: Read, Write, Edit, Glob, Grep, Bash

**Usage**:
```typescript
const codeSpecialist = new CodeSpecialist();
await codeSpecialist.analyze("src/");
await codeSpecialist.refactor("src/utils", "Extract helper functions");
```

### Research Specialist

**Domain**: Information gathering

**Capabilities**:
- Web search
- Documentation lookup
- Information synthesis
- Fact checking

**Tools**: WebSearch, WebFetch, Read, Glob

**Usage**:
```typescript
const researchSpecialist = new ResearchSpecialist();
await researchSpecialist.research("React Server Components");
await researchSpecialist.lookupDocs("nextjs", "routing");
```

### Data Specialist

**Domain**: Data processing

**Capabilities**:
- Data analysis
- Data transformation
- Data validation
- Statistics

**Tools**: Read, Write, Bash, Glob, Grep

**Usage**:
```typescript
const dataSpecialist = new DataSpecialist();
await dataSpecialist.analyze("data/users.json");
await dataSpecialist.transform("input.csv", "Convert to JSON");
```

### Security Specialist

**Domain**: Application security

**Capabilities**:
- Vulnerability assessment
- Code auditing
- Dependency scanning
- Threat modeling

**Tools**: Read, Glob, Grep, Bash, WebSearch

**Usage**:
```typescript
const securitySpecialist = new SecuritySpecialist();
await securitySpecialist.audit("src/");
await securitySpecialist.scanSecrets(".");
```

## Creating Specialists

```typescript
import { createSpecialist, createAllSpecialists } from "./agents";

// Create single specialist
const codeAgent = createSpecialist("code");

// Create all specialists
const specialists = createAllSpecialists();
```
