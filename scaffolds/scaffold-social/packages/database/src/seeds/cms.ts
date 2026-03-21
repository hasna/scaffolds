import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  cmsPages,
  cmsSections,
  blogCategories,
  blogPosts,
  changelogEntries,
  docsPages,
  users,
} from "../schema";

export async function seedCmsPages() {
  console.log("Seeding CMS pages...");

  // Home page
  const [homePage] = await db
    .insert(cmsPages)
    .values({
      title: "Home",
      slug: "home",
      status: "published",
      seoTitle: "SaaS Scaffold - Build SaaS Products 10x Faster",
      seoDescription:
        "Production-ready SaaS scaffold with authentication, billing, teams, webhooks, and AI. Skip months of boilerplate.",
    })
    .onConflictDoUpdate({
      target: cmsPages.slug,
      set: {
        title: "Home",
        status: "published",
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!homePage) {
    throw new Error("Failed to create home page");
  }

  // Home page sections
  await db
    .insert(cmsSections)
    .values([
      {
        pageId: homePage.id,
        type: "hero",
        order: 0,
        content: {
          title: "Build SaaS Products",
          highlight: "10x Faster",
          description:
            "Production-ready SaaS scaffold with authentication, billing, teams, webhooks, and AI. Skip months of boilerplate and focus on what makes your product unique.",
          primaryCta: { text: "Get Started Free", href: "/register" },
          secondaryCta: { text: "Documentation", href: "/docs" },
        },
      },
      {
        pageId: homePage.id,
        type: "features",
        order: 1,
        content: {
          title: "Everything You Need",
          description:
            "All the features you need to build and scale your SaaS product.",
          features: [
            {
              icon: "Shield",
              title: "Secure Authentication",
              description:
                "Enterprise-grade security with NextAuth.js, 2FA support, and OAuth providers.",
            },
            {
              icon: "Users",
              title: "Multi-Tenancy",
              description:
                "Built-in team management with roles, permissions, and tenant isolation.",
            },
            {
              icon: "CreditCard",
              title: "Stripe Billing",
              description:
                "Complete subscription management with metered billing and invoicing.",
            },
            {
              icon: "Bot",
              title: "AI Assistant",
              description:
                "Integrated AI chat with OpenAI and Anthropic, streaming responses.",
            },
            {
              icon: "Webhook",
              title: "Webhooks",
              description:
                "Event-driven architecture with HMAC signing and delivery tracking.",
            },
            {
              icon: "Zap",
              title: "Background Jobs",
              description:
                "BullMQ-powered async processing with Redis for reliable job queues.",
            },
          ],
        },
      },
      {
        pageId: homePage.id,
        type: "testimonials",
        order: 2,
        content: {
          title: "What Our Customers Say",
          testimonials: [
            {
              quote:
                "This scaffold saved us months of development time. We launched our MVP in just 2 weeks!",
              author: "Sarah Chen",
              role: "CTO",
              company: "TechStartup",
            },
            {
              quote:
                "The best SaaS boilerplate I've used. Everything just works out of the box.",
              author: "Michael Park",
              role: "Founder",
              company: "DevTools Inc",
            },
            {
              quote:
                "Clean code, great architecture. Perfect for teams who want to move fast.",
              author: "Emily Johnson",
              role: "Engineering Lead",
              company: "ScaleUp Co",
            },
          ],
        },
      },
      {
        pageId: homePage.id,
        type: "pricing",
        order: 3,
        content: {
          title: "Simple Pricing",
          description: "Choose the plan that's right for you.",
        },
      },
      {
        pageId: homePage.id,
        type: "faq",
        order: 4,
        content: {
          title: "Frequently Asked Questions",
          items: [
            {
              question: "What's included in the scaffold?",
              answer:
                "Authentication, multi-tenancy, Stripe billing, webhooks, AI assistant, background jobs, and more. Everything you need to build a production-ready SaaS.",
            },
            {
              question: "Can I use this for commercial projects?",
              answer:
                "Yes! The scaffold comes with a commercial license that allows you to use it for any project, including commercial ones.",
            },
            {
              question: "Do you offer support?",
              answer:
                "We offer community support through our Discord server, and priority support for Pro and Enterprise plans.",
            },
            {
              question: "What technologies are used?",
              answer:
                "Next.js 14, TypeScript, Drizzle ORM, PostgreSQL, Redis, BullMQ, Stripe, and shadcn/ui components.",
            },
          ],
        },
      },
      {
        pageId: homePage.id,
        type: "cta",
        order: 5,
        content: {
          title: "Ready to Build?",
          description:
            "Join thousands of developers building their next SaaS product with our scaffold.",
          buttonText: "Start Building Today",
          buttonHref: "/register",
        },
      },
    ])
    .onConflictDoNothing();

  console.log("Seeded home page with sections");
}

export async function seedBlogContent() {
  console.log("Seeding blog content...");

  // Get author user (first admin or super_admin user)
  const author = await db.query.users.findFirst({
    where: eq(users.role, "super_admin"),
  });

  if (!author) {
    console.log("No super_admin user found, skipping blog posts seeding");
    return;
  }

  // Categories
  const categories = [
    {
      name: "Product Updates",
      slug: "product-updates",
      description: "Latest features and improvements",
    },
    {
      name: "Engineering",
      slug: "engineering",
      description: "Technical deep dives and best practices",
    },
    {
      name: "Tutorials",
      slug: "tutorials",
      description: "Step-by-step guides and how-tos",
    },
  ];

  const insertedCategories = [];
  for (const cat of categories) {
    const [category] = await db
      .insert(blogCategories)
      .values(cat)
      .onConflictDoUpdate({
        target: blogCategories.slug,
        set: { name: cat.name, description: cat.description, updatedAt: new Date() },
      })
      .returning();
    insertedCategories.push(category);
  }

  // Blog posts
  const posts = [
    {
      title: "Introducing SaaS Scaffold v1.0",
      slug: "introducing-saas-scaffold-v1",
      excerpt:
        "After months of development, we're excited to announce the public release of SaaS Scaffold - the fastest way to build production-ready SaaS applications.",
      content: `# Introducing SaaS Scaffold v1.0

We're thrilled to announce the public release of SaaS Scaffold, a comprehensive foundation for building SaaS applications.

## What's Included

- **Authentication**: Multi-provider auth with NextAuth.js, including Google, GitHub, and email/password
- **Multi-tenancy**: Complete team management with roles and permissions
- **Billing**: Stripe integration with subscriptions, invoices, and metered billing
- **AI Assistant**: Built-in chat interface with OpenAI and Anthropic support
- **Webhooks**: Event-driven architecture with HMAC signing
- **Background Jobs**: BullMQ-powered async processing

## Getting Started

Clone the repository and follow our getting started guide to have your SaaS up and running in minutes.

## What's Next

We're working on even more features including:
- Advanced analytics dashboard
- Custom branding options
- Additional OAuth providers

Stay tuned for more updates!`,
      categoryId: insertedCategories[0]?.id,
      status: "published" as const,
      publishedAt: new Date("2024-01-15"),
    },
    {
      title: "Building a Multi-tenant Architecture with Drizzle ORM",
      slug: "multi-tenant-architecture-drizzle",
      excerpt:
        "Learn how we implemented tenant isolation in SaaS Scaffold using Drizzle ORM and PostgreSQL.",
      content: `# Building a Multi-tenant Architecture with Drizzle ORM

Multi-tenancy is a core requirement for SaaS applications. Here's how we implemented it in SaaS Scaffold.

## The Challenge

Every SaaS application needs to:
1. Isolate data between tenants
2. Share common resources efficiently
3. Scale to thousands of tenants

## Our Approach

We chose a **shared database, separate schema** approach using PostgreSQL and Drizzle ORM.

### Key Concepts

1. **Tenant ID Column**: Every table that stores tenant-specific data includes a \`tenant_id\` column
2. **Row-Level Security**: Database policies ensure tenants can only access their own data
3. **Automatic Scoping**: Our middleware automatically scopes queries to the current tenant

## Code Example

\`\`\`typescript
// Scoped query example
const projects = await db.query.projects.findMany({
  where: eq(projects.tenantId, currentTenant.id),
});
\`\`\`

## Best Practices

- Always include tenant context in your API routes
- Use middleware to validate tenant access
- Implement audit logging for compliance`,
      categoryId: insertedCategories[1]?.id,
      status: "published" as const,
      publishedAt: new Date("2024-01-20"),
    },
    {
      title: "Setting Up Stripe Subscriptions in 10 Minutes",
      slug: "stripe-subscriptions-tutorial",
      excerpt:
        "A quick guide to implementing subscription billing with Stripe in your SaaS application.",
      content: `# Setting Up Stripe Subscriptions in 10 Minutes

Billing is one of the most critical parts of any SaaS. Here's how to get it right.

## Prerequisites

- A Stripe account
- Your API keys configured
- Basic understanding of subscriptions

## Step 1: Configure Products

First, create your pricing plans in the Stripe dashboard or via the API.

## Step 2: Implement Checkout

\`\`\`typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: priceId,
    quantity: 1,
  }],
  success_url: '/billing?success=true',
  cancel_url: '/billing?canceled=true',
});
\`\`\`

## Step 3: Handle Webhooks

Set up webhook handlers for:
- \`checkout.session.completed\`
- \`invoice.paid\`
- \`customer.subscription.updated\`

## That's It!

Your subscription billing is now ready. Check our documentation for advanced features like metered billing and custom pricing.`,
      categoryId: insertedCategories[2]?.id,
      status: "published" as const,
      publishedAt: new Date("2024-01-25"),
    },
  ];

  for (const post of posts) {
    await db
      .insert(blogPosts)
      .values({
        ...post,
        authorId: author.id,
      })
      .onConflictDoUpdate({
        target: blogPosts.slug,
        set: {
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          categoryId: post.categoryId,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${categories.length} blog categories and ${posts.length} blog posts`);
}

export async function seedChangelogEntries() {
  console.log("Seeding changelog entries...");

  const entries = [
    {
      version: "1.2.0",
      title: "AI Assistant Improvements",
      content: `- Added support for Claude 3 Opus model
- Improved streaming response performance
- Added conversation history export
- Fixed token counting accuracy`,
      type: "feature" as const,
      publishedAt: new Date("2024-01-28"),
    },
    {
      version: "1.1.0",
      title: "Team Management Updates",
      content: `- Added bulk invite functionality
- Improved role management UI
- Added team activity log
- Fixed invitation expiry handling`,
      type: "improvement" as const,
      publishedAt: new Date("2024-01-20"),
    },
    {
      version: "1.0.1",
      title: "Bug Fixes and Performance",
      content: `- Fixed authentication redirect loop
- Improved database query performance
- Fixed webhook delivery retries
- Updated dependencies for security`,
      type: "fix" as const,
      publishedAt: new Date("2024-01-16"),
    },
    {
      version: "1.0.0",
      title: "Initial Release",
      content: `SaaS Scaffold v1.0.0 is here!

Features included:
- Multi-provider authentication
- Team management with roles
- Stripe billing integration
- AI Assistant
- Webhooks with HMAC signing
- Background job processing`,
      type: "feature" as const,
      publishedAt: new Date("2024-01-15"),
    },
  ];

  for (const entry of entries) {
    await db
      .insert(changelogEntries)
      .values(entry)
      .onConflictDoUpdate({
        target: changelogEntries.version,
        set: {
          title: entry.title,
          content: entry.content,
          type: entry.type,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${entries.length} changelog entries`);
}

export async function seedDocs() {
  console.log("Seeding documentation...");

  const docs = [
    {
      title: "Getting Started",
      slug: "getting-started",
      content: `# Getting Started

Welcome to SaaS Scaffold! This guide will help you get up and running in minutes.

## Prerequisites

Before you begin, make sure you have:
- Node.js 18 or later
- PostgreSQL database
- Redis server
- Stripe account (for billing)

## Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/your-org/saas-scaffold
cd saas-scaffold
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up your environment:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Run database migrations:
\`\`\`bash
npm run db:migrate
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Next Steps

- [Configure Authentication](/docs/authentication)
- [Set up Billing](/docs/billing)
- [Create Your First Team](/docs/teams)`,
      order: 0,
      seoDescription: "Get started with SaaS Scaffold in minutes",
    },
    {
      title: "Authentication",
      slug: "authentication",
      content: `# Authentication

SaaS Scaffold uses NextAuth.js for authentication, supporting multiple providers.

## Supported Providers

- Email/Password
- Google OAuth
- GitHub OAuth
- Microsoft Azure AD

## Configuration

Add your provider credentials to \`.env\`:

\`\`\`bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
\`\`\`

## Two-Factor Authentication

Enable 2FA for enhanced security:

1. Go to Settings > Security
2. Click "Enable 2FA"
3. Scan the QR code with your authenticator app
4. Enter the verification code

## Session Management

Sessions are stored in the database and managed automatically. You can configure session duration in \`auth.config.ts\`.`,
      order: 1,
      seoDescription: "Configure authentication providers and security settings",
    },
    {
      title: "Billing",
      slug: "billing",
      content: `# Billing

Integrate Stripe for subscription management and payment processing.

## Setup

1. Create a Stripe account at stripe.com
2. Add your API keys to \`.env\`:

\`\`\`bash
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

## Creating Products

Define your pricing plans in the admin dashboard or use the seed script:

\`\`\`bash
npm run db:seed
\`\`\`

## Webhooks

The following Stripe events are handled:
- \`checkout.session.completed\`
- \`invoice.paid\`
- \`invoice.payment_failed\`
- \`customer.subscription.updated\`
- \`customer.subscription.deleted\`

## Customer Portal

Customers can manage their subscriptions through the Stripe Customer Portal. Link it from your billing page.`,
      order: 2,
      seoDescription: "Set up Stripe billing and subscription management",
    },
    {
      title: "Teams & Multi-tenancy",
      slug: "teams",
      content: `# Teams & Multi-tenancy

Build applications that support multiple teams with isolated data.

## Creating a Team

Teams are created automatically when a user signs up, or can be created manually:

\`\`\`typescript
const team = await createTeam({
  name: "My Team",
  slug: "my-team",
  ownerId: user.id,
});
\`\`\`

## Inviting Members

Send invitations via email:

\`\`\`typescript
await inviteTeamMember({
  teamId: team.id,
  email: "colleague@example.com",
  role: "member",
});
\`\`\`

## Roles

- **Owner**: Full access, can delete team
- **Admin**: Can manage members and settings
- **Member**: Can access team resources

## Data Isolation

All team data is automatically scoped using the \`tenantId\` column. Use the provided middleware to ensure proper isolation.`,
      order: 3,
      seoDescription: "Manage teams, members, and multi-tenant data isolation",
    },
    {
      title: "API Reference",
      slug: "api",
      content: `# API Reference

The SaaS Scaffold API follows REST conventions and uses JSON for request/response bodies.

## Authentication

All API requests require authentication via Bearer token or API key:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/v1/users
\`\`\`

## Endpoints

### Users
- \`GET /api/v1/users\` - List users
- \`GET /api/v1/users/:id\` - Get user
- \`PATCH /api/v1/users/:id\` - Update user

### Teams
- \`GET /api/v1/teams\` - List teams
- \`POST /api/v1/teams\` - Create team
- \`GET /api/v1/teams/:id\` - Get team
- \`PATCH /api/v1/teams/:id\` - Update team

### Subscriptions
- \`GET /api/v1/billing/subscription\` - Get current subscription
- \`POST /api/v1/billing/checkout\` - Create checkout session

## Rate Limiting

API requests are rate limited based on your plan:
- Free: 1,000 requests/month
- Pro: 10,000 requests/month
- Enterprise: Unlimited`,
      order: 4,
      seoDescription: "Complete API reference for SaaS Scaffold",
    },
  ];

  for (const doc of docs) {
    await db
      .insert(docsPages)
      .values(doc)
      .onConflictDoUpdate({
        target: docsPages.slug,
        set: {
          title: doc.title,
          content: doc.content,
          order: doc.order,
          seoDescription: doc.seoDescription,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${docs.length} documentation pages`);
}

export async function seedAllCmsContent() {
  await seedCmsPages();
  await seedBlogContent();
  await seedChangelogEntries();
  await seedDocs();
}
