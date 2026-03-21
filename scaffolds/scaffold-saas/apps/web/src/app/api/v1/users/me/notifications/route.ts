import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";

const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  marketing: z.boolean().optional(),
  updates: z.boolean().optional(),
  security: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
      columns: {
        notificationPreferences: true,
      },
    });

    return NextResponse.json({
      preferences: user?.notificationPreferences || {
        email: true,
        marketing: false,
        updates: true,
        security: true,
      },
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = notificationPreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get current preferences
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
      columns: {
        notificationPreferences: true,
      },
    });

    const currentPreferences: schema.NotificationPreferences = user?.notificationPreferences ?? {
      email: true,
      marketing: false,
      updates: true,
      security: true,
    };

    // Merge with new preferences
    const newPreferences: schema.NotificationPreferences = {
      ...currentPreferences,
      ...parsed.data,
    };

    // Update preferences
    await db
      .update(schema.users)
      .set({
        notificationPreferences: newPreferences,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, session.user.id));

    return NextResponse.json({ preferences: newPreferences });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
