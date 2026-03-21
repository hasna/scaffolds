import { db } from "../client";
import { users, webhookEvents, categories } from "../schema";
import bcrypt from "bcryptjs";

async function seedWebhookEvents() {
  console.log("Seeding webhook events...");

  const events = [
    {
      name: "article.published",
      description: "Triggered when an article is published",
      payloadSchema: {
        type: "object",
        properties: {
          article: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              publishedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    {
      name: "article.updated",
      description: "Triggered when an article is updated",
      payloadSchema: {
        type: "object",
        properties: {
          article: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    {
      name: "comment.created",
      description: "Triggered when a new comment is submitted",
      payloadSchema: {
        type: "object",
        properties: {
          comment: {
            type: "object",
            properties: {
              id: { type: "string" },
              articleId: { type: "string" },
              content: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    {
      name: "user.created",
      description: "Triggered when a new user registers",
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

async function seedCategories() {
  console.log("Seeding categories...");

  const cats = [
    { name: "Technology", slug: "technology", description: "Tech news and updates", color: "#3b82f6" },
    { name: "World", slug: "world", description: "Global news and events", color: "#10b981" },
    { name: "Business", slug: "business", description: "Business and economy news", color: "#f59e0b" },
    { name: "Science", slug: "science", description: "Science and research", color: "#8b5cf6" },
    { name: "Culture", slug: "culture", description: "Culture, arts, and entertainment", color: "#ec4899" },
    { name: "Sports", slug: "sports", description: "Sports news and highlights", color: "#ef4444" },
  ];

  for (const cat of cats) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: cat.name, description: cat.description, color: cat.color },
      });
  }

  console.log(`Seeded ${cats.length} categories`);
}

async function seedAdminUser() {
  console.log("Seeding admin user...");

  const email = "andrei@hasna.com";
  const password = "TestDev#2024!";
  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email,
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

  if (!user) throw new Error("Failed to create admin user");

  console.log(`Seeded admin user: ${email}`);
  console.log(`  Password: ${password}`);
}

async function main() {
  console.log("Starting database seed...\n");

  try {
    await seedWebhookEvents();
    await seedCategories();
    await seedAdminUser();

    console.log("\nDatabase seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
