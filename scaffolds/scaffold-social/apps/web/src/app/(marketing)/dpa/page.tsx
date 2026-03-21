import { type Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Shield, FileCheck, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description: "Our Data Processing Agreement (DPA) for GDPR and data protection compliance.",
};

export default function DPAPage() {
  return (
    <div className="container max-w-4xl py-12 md:py-20">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Data Processing Agreement</h1>
          <p className="text-muted-foreground">
            Last updated: December 25, 2025
          </p>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              DPA Documentation
            </CardTitle>
            <CardDescription>
              Download our pre-signed DPA or request a custom agreement
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Pre-Signed DPA (PDF)
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download DPA Template (DOCX)
            </Button>
          </CardContent>
        </Card>

        {/* Compliance Badges */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">GDPR Compliant</p>
                <p className="text-sm text-muted-foreground">EU data protection</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">SCCs Included</p>
                <p className="text-sm text-muted-foreground">Standard Contractual Clauses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <FileCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">SOC 2 Type II</p>
                <p className="text-sm text-muted-foreground">Security certification</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p>
              This Data Processing Agreement (&quot;DPA&quot;) forms part of the Terms of Service between you (&quot;Customer&quot;, &quot;Controller&quot;) and us (&quot;Processor&quot;, &quot;Company&quot;) for the use of our services.
            </p>
            <p>
              This DPA reflects the parties&apos; agreement with respect to the Processing of Personal Data in accordance with the requirements of Data Protection Laws, including the European Union General Data Protection Regulation (GDPR).
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>&quot;Personal Data&quot;</strong> means any information relating to an identified or identifiable natural person.
              </li>
              <li>
                <strong>&quot;Processing&quot;</strong> means any operation performed on Personal Data, such as collection, storage, use, disclosure, or deletion.
              </li>
              <li>
                <strong>&quot;Data Subject&quot;</strong> means the individual to whom Personal Data relates.
              </li>
              <li>
                <strong>&quot;Controller&quot;</strong> means the entity that determines the purposes and means of Processing Personal Data.
              </li>
              <li>
                <strong>&quot;Processor&quot;</strong> means the entity that Processes Personal Data on behalf of the Controller.
              </li>
              <li>
                <strong>&quot;Sub-processor&quot;</strong> means any third party engaged by the Processor to Process Personal Data.
              </li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">3. Scope and Purpose</h2>
            <p>
              The Processor shall Process Personal Data only to the extent necessary to provide the Services as described in the main agreement, and in accordance with the Customer&apos;s documented instructions.
            </p>
            <p>The categories of Personal Data processed may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact information (name, email, phone number)</li>
              <li>Account credentials (hashed passwords, authentication tokens)</li>
              <li>Usage data (logs, analytics, preferences)</li>
              <li>Content data (user-generated content, files, communications)</li>
              <li>Technical data (IP addresses, device information, browser data)</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">4. Processor Obligations</h2>
            <p>The Processor agrees to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process Personal Data only on documented instructions from the Controller</li>
              <li>Ensure that persons authorized to Process Personal Data are bound by confidentiality</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Assist the Controller in fulfilling Data Subject rights requests</li>
              <li>Delete or return Personal Data upon termination of the agreement</li>
              <li>Make available all information necessary to demonstrate compliance</li>
              <li>Notify the Controller of any Personal Data breach without undue delay</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">5. Sub-processors</h2>
            <p>
              The Controller provides general authorization for the Processor to engage Sub-processors. The Processor shall:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain a list of current Sub-processors</li>
              <li>Notify the Controller of any intended changes</li>
              <li>Ensure Sub-processors are bound by data protection obligations</li>
              <li>Remain fully liable for Sub-processor compliance</li>
            </ul>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Current Sub-processors</h4>
              <ul className="text-sm space-y-1">
                <li><strong>Amazon Web Services (AWS)</strong> - Cloud infrastructure (US/EU)</li>
                <li><strong>Stripe</strong> - Payment processing (US)</li>
                <li><strong>Vercel</strong> - Application hosting (US/EU)</li>
                <li><strong>Sentry</strong> - Error monitoring (US)</li>
                <li><strong>Anthropic</strong> - AI services (US)</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">6. Security Measures</h2>
            <p>
              The Processor implements and maintains appropriate technical and organizational measures, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of Personal Data in transit and at rest (AES-256, TLS 1.3)</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Incident detection and response procedures</li>
              <li>Business continuity and disaster recovery plans</li>
              <li>Employee security training and background checks</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">7. International Transfers</h2>
            <p>
              For transfers of Personal Data outside the European Economic Area, the Processor ensures adequate protection through:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
              <li>Adequacy decisions where applicable</li>
              <li>Supplementary measures as required by the CJEU Schrems II decision</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">8. Data Subject Rights</h2>
            <p>
              The Processor shall assist the Controller in responding to Data Subject requests to exercise their rights under applicable data protection laws, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right of access</li>
              <li>Right to rectification</li>
              <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
              <li>Right to restriction of Processing</li>
              <li>Right to data portability</li>
              <li>Right to object</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">9. Data Breach Notification</h2>
            <p>
              In the event of a Personal Data breach, the Processor shall notify the Controller without undue delay and in any event within 72 hours of becoming aware of the breach. The notification shall include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Description of the nature of the breach</li>
              <li>Categories and approximate number of Data Subjects affected</li>
              <li>Likely consequences of the breach</li>
              <li>Measures taken or proposed to address the breach</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">10. Term and Termination</h2>
            <p>
              This DPA shall remain in effect for the duration of the Processing of Personal Data by the Processor. Upon termination:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Processor shall delete or return all Personal Data within 30 days</li>
              <li>The Processor shall provide certification of data deletion upon request</li>
              <li>Certain data may be retained as required by law (with notification)</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Contact Information</h2>
            <p>
              For questions about this DPA or to exercise data protection rights:
            </p>
            <ul className="list-none space-y-1">
              <li><strong>Email:</strong> dpo@example.com</li>
              <li><strong>Address:</strong> [Company Address]</li>
              <li><strong>Data Protection Officer:</strong> [DPO Name]</li>
            </ul>
          </section>

          <section className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              See also: <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> | <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> | <Link href="/security" className="text-primary hover:underline">Security</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
