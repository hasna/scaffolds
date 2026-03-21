import { db } from "../client";
import { pricingPlans, webhookEvents, users, tenants, teamMembers } from "../schema";
import bcrypt from "bcryptjs";
import { seedAllCmsContent } from "./cms";
import { seedResumes } from "./resumes";

async function seedPricingPlans() {
  console.log("Seeding pricing plans...");

  const plans = [
    {
      name: "Free",
      slug: "free",
      description: "Get started for free with basic features",
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        { name: "Up to 2 team members", included: true },
        { name: "Basic analytics", included: true },
        { name: "Community support", included: true },
        { name: "API access", included: false },
        { name: "Webhooks", included: false },
        { name: "AI Assistant", included: false },
      ],
      limits: {
        teamMembers: 2,
        apiKeys: 0,
        webhooks: 0,
        assistantMessages: 0,
        storageGb: 1,
      },
      sortOrder: 0,
    },
    {
      name: "Pro",
      slug: "pro",
      description: "Perfect for growing teams",
      priceMonthly: 2900, // $29/month
      priceYearly: 29000, // $290/year (2 months free)
      features: [
        { name: "Up to 10 team members", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Email support", included: true },
        { name: "API access", included: true, limit: 10000 },
        { name: "Webhooks", included: true, limit: 5 },
        { name: "AI Assistant", included: true, limit: 1000 },
      ],
      limits: {
        teamMembers: 10,
        apiKeys: 5,
        webhooks: 5,
        assistantMessages: 1000,
        storageGb: 10,
      },
      sortOrder: 1,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "For large organizations with custom needs",
      priceMonthly: 9900, // $99/month
      priceYearly: 99000, // $990/year
      features: [
        { name: "Unlimited team members", included: true },
        { name: "Custom analytics", included: true },
        { name: "Priority support", included: true },
        { name: "API access", included: true, limit: -1 },
        { name: "Webhooks", included: true, limit: -1 },
        { name: "AI Assistant", included: true, limit: -1 },
        { name: "SSO/SAML", included: true },
        { name: "Custom integrations", included: true },
        { name: "SLA", included: true },
      ],
      limits: {
        teamMembers: -1, // unlimited
        apiKeys: -1,
        webhooks: -1,
        assistantMessages: -1,
        storageGb: 100,
      },
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await db
      .insert(pricingPlans)
      .values(plan)
      .onConflictDoUpdate({
        target: pricingPlans.slug,
        set: {
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features,
          limits: plan.limits,
          sortOrder: plan.sortOrder,
        },
      });
  }

  console.log(`Seeded ${plans.length} pricing plans`);
}

async function seedWebhookEvents() {
  console.log("Seeding webhook events...");

  const events = [
    {
      name: "user.created",
      description: "Triggered when a new user is created",
      payloadSchema: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    {
      name: "user.updated",
      description: "Triggered when a user is updated",
      payloadSchema: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          changes: { type: "object" },
        },
      },
    },
    {
      name: "user.deleted",
      description: "Triggered when a user is deleted",
      payloadSchema: {
        type: "object",
        properties: {
          userId: { type: "string" },
          deletedAt: { type: "string", format: "date-time" },
        },
      },
    },
    {
      name: "team.member_added",
      description: "Triggered when a team member is added",
      payloadSchema: {
        type: "object",
        properties: {
          tenantId: { type: "string" },
          member: {
            type: "object",
            properties: {
              userId: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
            },
          },
          invitedBy: { type: "string" },
        },
      },
    },
    {
      name: "team.member_removed",
      description: "Triggered when a team member is removed",
      payloadSchema: {
        type: "object",
        properties: {
          tenantId: { type: "string" },
          userId: { type: "string" },
          removedBy: { type: "string" },
        },
      },
    },
    {
      name: "subscription.created",
      description: "Triggered when a subscription is created",
      payloadSchema: {
        type: "object",
        properties: {
          subscription: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              planId: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
    {
      name: "subscription.updated",
      description: "Triggered when a subscription is updated",
      payloadSchema: {
        type: "object",
        properties: {
          subscription: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              planId: { type: "string" },
              status: { type: "string" },
            },
          },
          previousPlanId: { type: "string" },
        },
      },
    },
    {
      name: "subscription.canceled",
      description: "Triggered when a subscription is canceled",
      payloadSchema: {
        type: "object",
        properties: {
          subscriptionId: { type: "string" },
          tenantId: { type: "string" },
          canceledAt: { type: "string", format: "date-time" },
          cancelAtPeriodEnd: { type: "boolean" },
        },
      },
    },
    {
      name: "invoice.paid",
      description: "Triggered when an invoice is paid",
      payloadSchema: {
        type: "object",
        properties: {
          invoice: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string" },
              paidAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    {
      name: "invoice.payment_failed",
      description: "Triggered when an invoice payment fails",
      payloadSchema: {
        type: "object",
        properties: {
          invoice: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string" },
            },
          },
          error: { type: "string" },
        },
      },
    },
  ];

  for (const event of events) {
    await db
      .insert(webhookEvents)
      .values(event)
      .onConflictDoUpdate({
        target: webhookEvents.name,
        set: {
          description: event.description,
          payloadSchema: event.payloadSchema,
        },
      });
  }

  console.log(`Seeded ${events.length} webhook events`);
}

async function seedTestUser() {
  console.log("Seeding test user...");

  const testEmail = "andrei@hasna.com";
  const testPassword = "TestDev#2024!";
  const passwordHash = await bcrypt.hash(testPassword, 12);

  // Create or update test user
  const [user] = await db
    .insert(users)
    .values({
      email: testEmail,
      name: "Andrei Hasna",
      passwordHash,
      role: "super_admin",
      emailVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: "Andrei Hasna",
        passwordHash,
        role: "super_admin",
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create or update test user");
  }

  // Create or update test tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Hasna Dev",
      slug: "hasna-dev",
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: {
        name: "Hasna Dev",
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!tenant) {
    throw new Error("Failed to create or update test tenant");
  }

  // Create team member (link user to tenant as owner)
  await db
    .insert(teamMembers)
    .values({
      tenantId: tenant.id,
      userId: user.id,
      role: "owner",
    })
    .onConflictDoNothing();

  console.log(`Seeded test user: ${testEmail}`);
  console.log(`  Password: ${testPassword}`);
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
}

async function main() {
  console.log("Starting database seed...\n");

  try {
    await seedPricingPlans();
    await seedWebhookEvents();
    await seedTestUser();
    await seedAllCmsContent();
    await seedResumes();

    console.log("\nDatabase seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
