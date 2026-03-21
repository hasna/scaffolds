export type LegalDocId =
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'disclaimer'
  | 'acceptable-use'
  | 'dmca'
  | 'accessibility'

export interface LegalDoc {
  id: LegalDocId
  slug: string
  title: string
  updatedAt: string
  markdown: string
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function inferContactEmail(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname
    return `support@${host}`
  } catch {
    return 'support@example.com'
  }
}

export function getLegalDocs(input: { siteName: string; siteUrl: string }): Record<LegalDocId, LegalDoc> {
  const siteUrl = normalizeUrl(input.siteUrl)
  const siteName = input.siteName
  const contactEmail = inferContactEmail(siteUrl)
  const updatedAt = 'December 15, 2025'

  const terms: LegalDoc = {
    id: 'terms',
    slug: 'terms',
    title: 'Terms of Service',
    updatedAt,
    markdown: `# Terms of Service

**Last updated:** ${updatedAt}

These Terms of Service ("Terms") govern your access to and use of **${siteName}** (the "Service"). By accessing or using the Service, you agree to these Terms.

## 1. Who we are
The Service is operated by ${siteName} ("we", "us", "our").

## 2. Eligibility
You must be able to form a binding contract in your jurisdiction to use the Service.

## 3. Accounts and admin access
If you create or use an admin account, you are responsible for:
- Maintaining the confidentiality of credentials and API tokens.
- All activity that occurs under your account.

## 4. Acceptable use
You agree not to:
- Use the Service for unlawful, harmful, or abusive activities.
- Attempt to bypass security or access non-public areas without authorization.
- Interfere with the Service (e.g., DDoS, automated scraping that harms availability).

## 5. User content
If you submit content (e.g., comments), you represent you have the rights to do so. You grant us a license to host, store, and display that content as needed to operate the Service.

## 6. Intellectual property
We and our licensors retain all rights in the Service, including design, code, and branding, except for content you provide.

## 7. Third-party services
The Service may link to or integrate third-party services. We are not responsible for their content or practices.

## 8. Disclaimers
The Service is provided "as is" and "as available" without warranties of any kind. We do not warrant that the Service will be uninterrupted, secure, or error-free.

## 9. Limitation of liability
To the fullest extent permitted by law, ${siteName} will not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, arising from your use of the Service.

## 10. Termination
We may suspend or terminate access to the Service if you violate these Terms or to protect the Service.

## 11. Changes to these Terms
We may update these Terms from time to time. Continued use of the Service after changes means you accept the updated Terms.

## 12. Contact
Questions about these Terms? Contact us at **${contactEmail}**.
`,
  }

  const privacy: LegalDoc = {
    id: 'privacy',
    slug: 'privacy',
    title: 'Privacy Policy',
    updatedAt,
    markdown: `# Privacy Policy

**Last updated:** ${updatedAt}

This Privacy Policy explains how **${siteName}** ("we", "us") collects, uses, and shares information when you use the Service at **${siteUrl}**.

## 1. Information we collect
We may collect:
- **Newsletter signups:** email address, optional phone number.
- **Comments:** name, email address, comment content, and timestamps.
- **Usage data:** basic logs (e.g., IP address, user agent) for security and performance.

## 2. How we use information
We use information to:
- Provide and maintain the Service.
- Send newsletters or updates if you subscribe.
- Moderate and display comments.
- Prevent fraud, abuse, and security incidents.

## 3. Cookies and local storage
We may use cookies or local storage for essential functionality (for example, remembering preferences).

## 4. Sharing
We do not sell your personal data. We may share information:
- With service providers that help operate the Service (hosting, analytics, email delivery).
- If required by law or to protect our rights and users.

## 5. Data retention
We keep information only as long as needed for the purposes described above, unless a longer retention period is required by law.

## 6. Your choices
Depending on your location, you may have rights to access, correct, or delete your personal data. You may also unsubscribe from newsletters at any time.

## 7. Security
We use reasonable measures to protect information, but no system is 100% secure.

## 8. Contact
Privacy questions or requests: **${contactEmail}**.
`,
  }

  const cookies: LegalDoc = {
    id: 'cookies',
    slug: 'cookies',
    title: 'Cookie Policy',
    updatedAt,
    markdown: `# Cookie Policy

**Last updated:** ${updatedAt}

This Cookie Policy explains how **${siteName}** uses cookies and similar technologies on **${siteUrl}**.

## 1. What are cookies?
Cookies are small text files stored on your device. Similar technologies include local storage and pixels.

## 2. How we use cookies
We may use cookies/local storage to:
- Enable essential site functionality.
- Remember settings and preferences.
- Measure performance and detect errors.

## 3. Managing cookies
You can control cookies through your browser settings. Note that disabling cookies may break parts of the Service.

## 4. Contact
Questions about this Cookie Policy: **${contactEmail}**.
`,
  }

  const disclaimer: LegalDoc = {
    id: 'disclaimer',
    slug: 'disclaimer',
    title: 'Disclaimer',
    updatedAt,
    markdown: `# Disclaimer

**Last updated:** ${updatedAt}

The information provided on **${siteName}** is for general informational purposes only and is not legal, financial, medical, or professional advice.

## 1. No professional advice
You should not rely on content on this site as a substitute for professional advice tailored to your situation.

## 2. Accuracy
We strive to keep content accurate and up to date, but we do not guarantee completeness or accuracy.

## 3. External links
Links to third-party sites are provided for convenience and do not constitute endorsement.

## 4. Contact
Questions: **${contactEmail}**.
`,
  }

  const acceptableUse: LegalDoc = {
    id: 'acceptable-use',
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    updatedAt,
    markdown: `# Acceptable Use Policy

**Last updated:** ${updatedAt}

This Acceptable Use Policy ("AUP") describes rules for using **${siteName}**.

## 1. You may not
- Break the law or encourage illegal activity.
- Post or share content that is abusive, hateful, harassing, or threatening.
- Upload malware, attempt credential stuffing, or probe for vulnerabilities.
- Interfere with availability (e.g., denial of service) or attempt to bypass access controls.
- Mass scrape the Service in ways that degrade performance or violate others' privacy.

## 2. Comments and community content
We may remove comments or other user content that violates this AUP or our Terms, and we may restrict access to prevent abuse.

## 3. Reporting
To report abuse, contact **${contactEmail}**.
`,
  }

  const dmca: LegalDoc = {
    id: 'dmca',
    slug: 'dmca',
    title: 'DMCA Policy',
    updatedAt,
    markdown: `# DMCA Policy

**Last updated:** ${updatedAt}

We respect intellectual property rights and respond to valid notices of alleged copyright infringement.

## 1. How to submit a DMCA notice
If you believe material on **${siteName}** infringes your copyright, email **${contactEmail}** with:
- Identification of the copyrighted work you claim has been infringed.
- Identification of the material and where it appears on the Service (URL).
- Your contact information.
- A statement that you have a good faith belief the use is not authorized.
- A statement, under penalty of perjury, that the information in the notice is accurate and you are authorized to act.
- Your physical or electronic signature.

## 2. Counter-notification
If you believe content was removed in error, you may submit a counter-notification to **${contactEmail}**.

## 3. Repeat infringers
We may terminate access for repeat infringement in appropriate circumstances.
`,
  }

  const accessibility: LegalDoc = {
    id: 'accessibility',
    slug: 'accessibility',
    title: 'Accessibility Statement',
    updatedAt,
    markdown: `# Accessibility Statement

**Last updated:** ${updatedAt}

We want **${siteName}** to be accessible to the widest possible audience.

## 1. Our commitment
We aim to support modern browsers and assistive technologies and to follow accessibility best practices.

## 2. Feedback
If you encounter accessibility barriers or need content in an alternative format, contact **${contactEmail}** and include:
- The page URL
- A description of the issue
- Your browser/device (if possible)

## 3. Ongoing improvements
Accessibility is an ongoing effort, and we welcome feedback to improve.
`,
  }

  return { terms, privacy, cookies, disclaimer, 'acceptable-use': acceptableUse, dmca, accessibility }
}

export function getLegalDocBySlug(
  input: { siteName: string; siteUrl: string },
  slug: string
): LegalDoc | null {
  const docs = getLegalDocs(input)
  const normalized = (slug || '').trim().toLowerCase()
  return Object.values(docs).find((d) => d.slug === normalized) || null
}
