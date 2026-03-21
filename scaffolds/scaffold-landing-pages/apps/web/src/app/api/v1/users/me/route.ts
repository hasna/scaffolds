import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [user] = await db
      .update(schema.users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.users.id, session.user.id))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
        role: schema.users.role,
      });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
