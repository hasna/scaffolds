import { type Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "Our guidelines for acceptable use of our platform and services.",
};

export default function AcceptableUsePage() {
  return (
    <div className="container max-w-3xl py-12 md:py-20">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Acceptable Use Policy</h1>
          <p className="text-muted-foreground">
            Last updated: December 25, 2025
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Introduction</h2>
            <p>
              This Acceptable Use Policy (&quot;AUP&quot;) outlines the rules and guidelines for using our platform and services. By using our services, you agree to comply with this policy.
            </p>
            <p>
              We reserve the right to take action against any user or account that violates this policy, including suspension or termination of access.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Prohibited Activities</h2>
            <p>
              You may not use our services to engage in, facilitate, or support any of the following activities:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Illegal Activities
                </h3>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Violating any applicable laws, regulations, or legal requirements</li>
                  <li>Engaging in fraud, identity theft, or financial crimes</li>
                  <li>Money laundering or terrorist financing</li>
                  <li>Trafficking in illegal goods or services</li>
                  <li>Infringing on intellectual property rights</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Harmful Content
                </h3>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Content that exploits or harms minors in any way</li>
                  <li>Content promoting violence, terrorism, or extremism</li>
                  <li>Hate speech or content discriminating based on protected characteristics</li>
                  <li>Harassment, bullying, or threats against individuals or groups</li>
                  <li>Non-consensual intimate imagery</li>
                  <li>Content promoting self-harm or suicide</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Security Violations
                </h3>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Unauthorized access to systems, accounts, or data</li>
                  <li>Distributing malware, viruses, or malicious code</li>
                  <li>Phishing, social engineering, or credential harvesting</li>
                  <li>Denial of service attacks or network disruption</li>
                  <li>Circumventing security measures or access controls</li>
                  <li>Vulnerability scanning without authorization</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Abuse of Services
                </h3>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Sending spam or unsolicited bulk communications</li>
                  <li>Creating fake or misleading accounts</li>
                  <li>Automated scraping or data harvesting</li>
                  <li>Circumventing usage limits or rate limiting</li>
                  <li>Reselling or sublicensing services without authorization</li>
                  <li>Using services for cryptocurrency mining</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  AI-Specific Restrictions
                </h3>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Generating content that violates our content policies</li>
                  <li>Using AI to create deepfakes or deceptive media</li>
                  <li>Automated decision-making that harms individuals</li>
                  <li>Training competing AI models using our outputs</li>
                  <li>Bypassing AI safety features or content filters</li>
                  <li>Using AI for surveillance or profiling without consent</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Content Guidelines</h2>
            <p>
              When creating or sharing content on our platform, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ensure you have the right to share the content</li>
              <li>Respect intellectual property and copyright laws</li>
              <li>Accurately represent yourself and your organization</li>
              <li>Not impersonate others or misrepresent affiliations</li>
              <li>Label AI-generated content where required by law or our policies</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Resource Usage</h2>
            <p>
              You agree to use our services responsibly and not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Consume resources disproportionate to your plan</li>
              <li>Interfere with other users&apos; use of the service</li>
              <li>Attempt to circumvent usage quotas or billing</li>
              <li>Use automated tools that generate excessive load</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Enforcement</h2>
            <p>
              We may take the following actions for violations of this policy:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Warning:</strong> Notification of the violation with request to cease</li>
              <li><strong>Content Removal:</strong> Removing violating content from the platform</li>
              <li><strong>Account Restriction:</strong> Limiting access to certain features</li>
              <li><strong>Account Suspension:</strong> Temporary suspension of account access</li>
              <li><strong>Account Termination:</strong> Permanent removal of account</li>
              <li><strong>Legal Action:</strong> Reporting to authorities or pursuing legal remedies</li>
            </ul>
            <p className="mt-4">
              The severity of our response depends on factors including the nature and severity of the violation, whether it was intentional, previous violations, and potential harm to others.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Reporting Violations</h2>
            <p>
              If you become aware of any violations of this policy, please report them to us immediately:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email: abuse@example.com</li>
              <li>Use the &quot;Report&quot; feature within the application</li>
              <li>Contact our support team through the help center</li>
            </ul>
            <p className="mt-4">
              We investigate all reports and take appropriate action. You will not face retaliation for good-faith reports.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Appeals</h2>
            <p>
              If you believe enforcement action was taken in error, you may appeal:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submit an appeal within 30 days of the action</li>
              <li>Explain why you believe the action was incorrect</li>
              <li>Provide any relevant evidence or context</li>
            </ul>
            <p className="mt-4">
              Appeals are reviewed by a different team member than the original decision-maker. We aim to respond within 10 business days.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Changes to This Policy</h2>
            <p>
              We may update this Acceptable Use Policy from time to time. Material changes will be communicated to users through email or in-app notifications. Continued use of our services after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p>
              Questions about this policy? Contact us at{" "}
              <Link href="/contact" className="text-primary hover:underline">
                our contact page
              </Link>
              {" "}or email legal@example.com.
            </p>
          </section>

          <section className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              See also: <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> | <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
