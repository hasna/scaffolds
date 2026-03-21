---
name: code-review
description: Comprehensive code review with security, performance, and maintainability analysis
version: 1.0.0
activation_keywords:
  - code review
  - review PR
  - analyze code
  - check quality
  - review changes
auto_activate: true
token_budget: 4000
---

# Code Review Skill

## Overview

Perform thorough code reviews focusing on:
- Security vulnerabilities (OWASP Top 10)
- Performance bottlenecks
- Code maintainability
- Best practices adherence

## Process

### 1. Initial Analysis

- Read changed files using `Glob` and `Read`
- Identify file types and frameworks
- Load relevant linting rules

### 2. Security Review

- Check for injection vulnerabilities (SQL, XSS, Command)
- Validate input sanitization
- Review authentication/authorization
- Scan for hardcoded secrets
- Check for insecure dependencies

### 3. Performance Review

- Identify N+1 queries
- Check for memory leaks
- Review async/await usage
- Analyze algorithmic complexity
- Check for unnecessary re-renders (React)

### 4. Code Quality

- Verify naming conventions
- Check function/method length (max 50 lines)
- Review error handling
- Assess test coverage
- Check for code duplication

## Output Format

Provide findings in structured format:

```json
{
  "summary": "Brief overview",
  "severity": "critical|high|medium|low",
  "findings": [
    {
      "file": "path/to/file",
      "line": 42,
      "type": "security|performance|quality",
      "severity": "critical|high|medium|low",
      "message": "Description",
      "suggestion": "How to fix"
    }
  ],
  "metrics": {
    "filesReviewed": 10,
    "issuesFound": 5,
    "criticalIssues": 1
  }
}
```

## Severity Levels

- **Critical**: Security vulnerabilities, data loss risks
- **High**: Performance issues, major bugs
- **Medium**: Code quality issues, minor bugs
- **Low**: Style issues, suggestions

## Common Issues to Check

### Security
- SQL injection via string concatenation
- XSS through unsanitized output
- Missing CSRF tokens
- Hardcoded credentials
- Insecure random number generation

### Performance
- Missing database indexes
- Large loops without pagination
- Blocking I/O operations
- Memory leaks from unclosed resources
- Unnecessary API calls

### Quality
- Functions over 50 lines
- Deep nesting (>3 levels)
- Magic numbers without constants
- Missing error handling
- Inconsistent naming
