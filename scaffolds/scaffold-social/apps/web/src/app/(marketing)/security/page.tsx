import { type Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  Key,
  Eye,
  Server,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security",
  description: "Learn about our security practices, certifications, and how we protect your data.",
};

export default function SecurityPage() {
  return (
    <div className="container max-w-4xl py-12 md:py-20">
      <div className="space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Security at Our Core</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We take security seriously. Your data protection is our top priority, backed by industry-leading practices and certifications.
          </p>
        </div>

        {/* Compliance Certifications */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Compliance & Certifications</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <FileCheck className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold">SOC 2 Type II</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Independently audited for security, availability, and confidentiality
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <FileCheck className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold">GDPR Compliant</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Full compliance with EU data protection regulations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <FileCheck className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold">CCPA Ready</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      California Consumer Privacy Act compliance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Security Features */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Security Features</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Encryption
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Data at Rest</p>
                    <p className="text-sm text-muted-foreground">AES-256 encryption for all stored data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Data in Transit</p>
                    <p className="text-sm text-muted-foreground">TLS 1.3 for all network communications</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Key Management</p>
                    <p className="text-sm text-muted-foreground">AWS KMS with automatic key rotation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">TOTP-based 2FA for all accounts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">SSO Integration</p>
                    <p className="text-sm text-muted-foreground">SAML 2.0 and OIDC support</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Password Security</p>
                    <p className="text-sm text-muted-foreground">Argon2id hashing with breach detection</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">24/7 Monitoring</p>
                    <p className="text-sm text-muted-foreground">Real-time threat detection and alerting</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Audit Logging</p>
                    <p className="text-sm text-muted-foreground">Comprehensive logs with 1-year retention</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Anomaly Detection</p>
                    <p className="text-sm text-muted-foreground">AI-powered suspicious activity detection</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Cloud Security</p>
                    <p className="text-sm text-muted-foreground">AWS with VPC isolation and WAF</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">DDoS Protection</p>
                    <p className="text-sm text-muted-foreground">Multi-layer DDoS mitigation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Regular Backups</p>
                    <p className="text-sm text-muted-foreground">Automated daily backups with geo-redundancy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Security Practices */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Our Security Practices</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Development Security</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Secure code reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Automated security scanning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Dependency vulnerability checks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">OWASP Top 10 compliance</span>
                </li>
              </ul>
            </div>

            <div className="border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Organizational Security</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Employee background checks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Security awareness training</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Principle of least privilege</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Incident response procedures</span>
                </li>
              </ul>
            </div>

            <div className="border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Testing & Validation</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Annual penetration testing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Bug bounty program</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Third-party security audits</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Continuous vulnerability scanning</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Report Vulnerability */}
        <section>
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Report a Security Vulnerability
              </CardTitle>
              <CardDescription>
                Found a security issue? We appreciate responsible disclosure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                If you believe you&apos;ve found a security vulnerability in our service, please report it to us. We investigate all legitimate reports and do our best to quickly fix the problem.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild>
                  <a href="mailto:security@example.com">
                    <Mail className="mr-2 h-4 w-4" />
                    security@example.com
                  </a>
                </Button>
                <Button variant="outline">
                  View Bug Bounty Program
                </Button>
              </div>
              <div className="mt-4 p-4 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>PGP Key Fingerprint:</strong> XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Related Links */}
        <section className="pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4">Related Resources</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/privacy" className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-secondary">
              Privacy Policy
            </Link>
            <Link href="/dpa" className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-secondary">
              Data Processing Agreement
            </Link>
            <Link href="/terms" className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-secondary">
              Terms of Service
            </Link>
            <Link href="/acceptable-use" className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-secondary">
              Acceptable Use Policy
            </Link>
            <Link href="/status" className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-secondary">
              System Status
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
