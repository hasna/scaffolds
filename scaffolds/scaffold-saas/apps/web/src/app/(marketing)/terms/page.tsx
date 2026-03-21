import Link from "next/link";
import type { Route } from "next";
import { Zap } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Link href={"/" as Route} className="flex items-center space-x-2">
            <Zap className="h-6 w-6" />
            <span className="font-bold">SaaS Scaffold</span>
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using our service, you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms,
              you are prohibited from using or accessing this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily access the materials on our service for personal,
              non-commercial transitory viewing only. This is the grant of a license, not a transfer
              of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software</li>
              <li>Remove any copyright or other proprietary notations</li>
              <li>Transfer the materials to another person</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Service Modifications</h2>
            <p>
              We reserve the right to modify or discontinue, temporarily or permanently, the service
              with or without notice. We shall not be liable to you or any third party for any
              modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Payment Terms</h2>
            <p>
              Paid services are billed in advance on a monthly or annual basis and are non-refundable.
              There will be no refunds or credits for partial months of service, upgrade/downgrade
              refunds, or refunds for months unused with an open account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p>
              In no event shall we be liable for any indirect, incidental, special, consequential,
              or punitive damages, including without limitation, loss of profits, data, use,
              goodwill, or other intangible losses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at
              legal@example.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
