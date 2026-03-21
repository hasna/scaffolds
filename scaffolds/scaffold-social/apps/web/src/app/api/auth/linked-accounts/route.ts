import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  try {
    const session = await requireAuth();

    const accounts = await db.query.accounts.findMany({
      where: eq(schema.accounts.userId, session.user.id),
      columns: {
        id: true,
        provider: true,
        providerAccountId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        linkedAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get linked accounts error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  provider: z.string().min(1),
});

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { provider } = parsed.data;

    // Check user has password or another linked account before unlinking
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
      columns: { passwordHash: true },
    });

    const accounts = await db.query.accounts.findMany({
      where: eq(schema.accounts.userId, session.user.id),
    });

    const hasPassword = !!user?.passwordHash;
    const otherAccounts = accounts.filter((a) => a.provider !== provider);

    if (!hasPassword && otherAccounts.length === 0) {
      return NextResponse.json(
        { error: "Cannot unlink your only login method. Add a password first." },
        { status: 400 }
      );
    }

    await db
      .delete(schema.accounts)
      .where(
        and(
          eq(schema.accounts.userId, session.user.id),
          eq(schema.accounts.provider, provider)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unlink account error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
