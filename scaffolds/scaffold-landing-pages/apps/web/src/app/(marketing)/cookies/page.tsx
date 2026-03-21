import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn about how we use cookies and similar technologies on our platform.",
};

export default function CookiesPage() {
  return (
    <div className="container max-w-3xl py-12 md:py-20">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-muted-foreground">
            Last updated: December 25, 2025
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
            </p>
            <p>
              We use cookies and similar technologies (such as web beacons, pixels, and local storage) to improve your experience, understand how our services are used, and for advertising and analytics purposes.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Types of Cookies We Use</h2>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">Essential Cookies</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access. You cannot opt out of these cookies.
                </p>
                <ul className="mt-2 text-sm space-y-1">
                  <li><strong>Session cookies</strong> - Keep you logged in during your visit</li>
                  <li><strong>Security cookies</strong> - Protect against CSRF attacks</li>
                  <li><strong>Load balancing cookies</strong> - Ensure stable performance</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">Functional Cookies</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  These cookies enable personalized features and remember your preferences, such as language settings, theme preferences, and other customizations.
                </p>
                <ul className="mt-2 text-sm space-y-1">
                  <li><strong>Preference cookies</strong> - Remember your settings and choices</li>
                  <li><strong>Theme cookies</strong> - Store your dark/light mode preference</li>
                  <li><strong>Language cookies</strong> - Remember your language selection</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">Analytics Cookies</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our services.
                </p>
                <ul className="mt-2 text-sm space-y-1">
                  <li><strong>Google Analytics</strong> - Page views and user behavior</li>
                  <li><strong>Performance monitoring</strong> - Page load times and errors</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">Marketing Cookies</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  These cookies are used to track visitors across websites to display relevant advertisements. They may be set by us or by third-party advertising partners.
                </p>
                <ul className="mt-2 text-sm space-y-1">
                  <li><strong>Advertising cookies</strong> - Deliver targeted advertisements</li>
                  <li><strong>Social media cookies</strong> - Enable sharing features</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Cookie Duration</h2>
            <p>
              Cookies can be either &quot;session&quot; cookies or &quot;persistent&quot; cookies:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Session cookies</strong> are temporary and are deleted when you close your browser
              </li>
              <li>
                <strong>Persistent cookies</strong> remain on your device for a set period or until you delete them
              </li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Third-Party Cookies</h2>
            <p>
              Some cookies on our website are placed by third-party services that appear on our pages. We do not control these third-party cookies. The relevant third party is responsible for these cookies.
            </p>
            <p>Third-party services we use include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Stripe (payment processing)</li>
              <li>Google Analytics (website analytics)</li>
              <li>Sentry (error tracking)</li>
              <li>Intercom (customer support)</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Managing Cookies</h2>
            <p>
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Browser settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain websites.
              </li>
              <li>
                <strong>Cookie consent:</strong> When you first visit our site, you can choose which types of non-essential cookies to accept.
              </li>
              <li>
                <strong>Opt-out tools:</strong> You can opt out of interest-based advertising by visiting the Digital Advertising Alliance or Network Advertising Initiative opt-out pages.
              </li>
            </ul>
            <p className="mt-4">
              Please note that blocking or deleting cookies may impact your experience and limit certain functionality on our website.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Do Not Track</h2>
            <p>
              Some browsers include a &quot;Do Not Track&quot; (DNT) feature. We currently do not respond to DNT signals as there is no industry standard for compliance.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at{" "}
              <Link href="/contact" className="text-primary hover:underline">
                our contact page
              </Link>
              {" "}or email us at privacy@example.com.
            </p>
          </section>

          <section className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              See also: <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> | <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
