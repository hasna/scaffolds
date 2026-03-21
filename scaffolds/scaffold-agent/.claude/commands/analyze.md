# Analyze Codebase

Perform comprehensive analysis of $ARGUMENTS using the code-review skill.

## Process

1. Load the code-review skill from `src/skills/code-review`
2. Scan files matching the target pattern
3. Run security, performance, and quality checks
4. Generate structured report

## Analysis Types

- **Security**: Check for OWASP Top 10 vulnerabilities
- **Performance**: Identify bottlenecks and inefficiencies
- **Quality**: Assess code maintainability and best practices
- **Dependencies**: Review for vulnerable or outdated packages

## Output Format

Provide findings in JSON format with severity levels:

```json
{
  "summary": "Brief overview",
  "severity": "critical|high|medium|low",
  "findings": [...],
  "metrics": {...}
}
```

## Usage

```
/analyze src/
/analyze src/api --security
/analyze . --full
```
