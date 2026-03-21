import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const users = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: [desc(schema.users.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("Admin get users error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
