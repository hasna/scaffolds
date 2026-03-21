import Link from "next/link";
import type { Route } from "next";
import { Zap } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account,
              make a purchase, or contact us for support. This information may include:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Name and email address</li>
              <li>Billing information and payment details</li>
              <li>Account preferences and settings</li>
              <li>Communications with our support team</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
            <p>
              We do not share, sell, rent, or trade your personal information with third parties
              for their commercial purposes. We may share information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>With your consent or at your direction</li>
              <li>With service providers who assist in our operations</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We take reasonable measures to help protect your personal information from loss,
              theft, misuse, unauthorized access, disclosure, alteration, and destruction.
              We use industry-standard encryption for data in transit and at rest.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as
              needed to provide you services. We will retain and use your information as necessary
              to comply with our legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our service
              and hold certain information. You can instruct your browser to refuse all cookies
              or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at
              privacy@example.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
