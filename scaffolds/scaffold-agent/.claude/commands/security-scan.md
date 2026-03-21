# Security Scan

Perform security audit on $ARGUMENTS.

## Process

1. Scan for hardcoded secrets and credentials
2. Check for OWASP Top 10 vulnerabilities
3. Analyze dependencies for known CVEs
4. Review authentication and authorization
5. Generate security report

## Checks Performed

### Code Security
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting)
- Command injection
- Path traversal
- Insecure deserialization

### Secrets Detection
- API keys and tokens
- Database credentials
- Private keys
- OAuth secrets

### Dependencies
- Known vulnerabilities (CVE)
- Outdated packages
- Unmaintained libraries

## Output

Security findings are reported with:
- Severity level (Critical/High/Medium/Low)
- File location and line number
- Description of the issue
- Remediation steps
- Reference links

## Usage

```
/security-scan src/
/security-scan . --full
/security-scan src/api --dependencies
```
