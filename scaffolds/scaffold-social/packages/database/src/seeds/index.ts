import { db } from "../client";
import { users, profiles } from "../schema";
import bcrypt from "bcryptjs";

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

  // Create profile for the test user
  await db
    .insert(profiles)
    .values({
      userId: user.id,
      username: "andrei",
      displayName: "Andrei Hasna",
      bio: "Building things on the internet.",
    })
    .onConflictDoUpdate({
      target: profiles.username,
      set: {
        displayName: "Andrei Hasna",
        bio: "Building things on the internet.",
        updatedAt: new Date(),
      },
    });

  console.log(`Seeded test user: ${testEmail}`);
  console.log(`  Password: ${testPassword}`);
  console.log(`  Username: @andrei`);
}

async function main() {
  console.log("Starting database seed...\n");

  try {
    await seedTestUser();

    console.log("\nDatabase seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
