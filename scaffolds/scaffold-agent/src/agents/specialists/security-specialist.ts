/**
 * Security Specialist Agent
 * Handles security audits and vulnerability assessment
 */

import { BaseSpecialist } from "./base-specialist.js";
import type { AgentResult } from "../../core/types.js";

const SECURITY_SPECIALIST_PROMPT = `You are a Security Specialist Agent focused on application security.

## Your Capabilities

1. **Vulnerability Assessment**: Find security weaknesses
2. **Code Audit**: Review code for security issues
3. **Dependency Scanning**: Check for vulnerable dependencies
4. **Security Best Practices**: Recommend security improvements
5. **Threat Modeling**: Identify potential attack vectors

## Available Tools

- Read: Read code and config files
- Glob: Find security-relevant files
- Grep: Search for security patterns
- Bash: Run security scanning tools
- WebSearch: Research vulnerabilities

## Guidelines

1. Check OWASP Top 10 vulnerabilities
2. Scan for hardcoded secrets
3. Review authentication/authorization
4. Check input validation
5. Assess encryption usage

## OWASP Top 10 (2021)

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. SSRF

## Output Format

Security findings should include:
1. **Severity**: Critical/High/Medium/Low
2. **Location**: File and line number
3. **Description**: What the issue is
4. **Impact**: Potential consequences
5. **Remediation**: How to fix it
6. **References**: CVE, CWE, or documentation links
`;

export class SecuritySpecialist extends BaseSpecialist {
  constructor() {
    super({
      domain: "security",
      tools: ["Read", "Glob", "Grep", "Bash", "WebSearch"],
      systemPrompt: SECURITY_SPECIALIST_PROMPT,
    });
  }

  /**
   * Perform security audit
   */
  async audit(target: string): Promise<AgentResult> {
    return this.execute(`Perform a comprehensive security audit of ${target}.

Check for:
1. OWASP Top 10 vulnerabilities
2. Hardcoded secrets and credentials
3. Insecure configurations
4. Authentication/authorization issues
5. Input validation problems
6. Encryption weaknesses
7. Vulnerable dependencies

Provide findings with severity, location, and remediation steps.`);
  }

  /**
   * Scan for secrets
   */
  async scanSecrets(target: string): Promise<AgentResult> {
    return this.execute(`Scan ${target} for hardcoded secrets and credentials.

Look for:
1. API keys and tokens
2. Passwords and connection strings
3. Private keys and certificates
4. AWS/GCP/Azure credentials
5. Database credentials
6. OAuth secrets

Report each finding with its location and recommend secure alternatives.`);
  }

  /**
   * Check dependencies
   */
  async checkDependencies(projectPath: string): Promise<AgentResult> {
    return this.execute(`Analyze dependencies in ${projectPath} for security vulnerabilities.

Steps:
1. Identify package manager (npm, pip, etc.)
2. List all dependencies
3. Check for known vulnerabilities
4. Identify outdated packages
5. Suggest updates and alternatives

Report each vulnerable dependency with:
- Package name and version
- CVE/vulnerability ID
- Severity
- Recommended action`);
  }

  /**
   * Review authentication
   */
  async reviewAuth(target: string): Promise<AgentResult> {
    return this.execute(`Review authentication and authorization in ${target}.

Evaluate:
1. Password storage (hashing, salting)
2. Session management
3. Token handling (JWT, etc.)
4. Role-based access control
5. Rate limiting
6. Multi-factor authentication

Report issues and recommend improvements.`);
  }

  /**
   * Threat modeling
   */
  async threatModel(description: string): Promise<AgentResult> {
    return this.execute(`Perform threat modeling for the following system:

${description}

Use STRIDE methodology:
1. **Spoofing**: Identity threats
2. **Tampering**: Data integrity threats
3. **Repudiation**: Audit/logging threats
4. **Information Disclosure**: Confidentiality threats
5. **Denial of Service**: Availability threats
6. **Elevation of Privilege**: Authorization threats

For each threat:
- Describe the attack vector
- Assess likelihood and impact
- Suggest mitigations`);
  }
}
