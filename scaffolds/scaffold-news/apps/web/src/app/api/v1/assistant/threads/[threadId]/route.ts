import { NextRequest, NextResponse } from "next/server";
import { getApiContext, type RouteContext } from "@/lib/api-context";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and } from "drizzle-orm";

type Params = RouteContext<{ threadId: string }>;

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, tenantId } = authResult.context;
    const { threadId } = await params;

    const thread = await db.query.assistantThreads.findFirst({
      where: and(
        eq(schema.assistantThreads.id, threadId),
        eq(schema.assistantThreads.tenantId, tenantId),
        eq(schema.assistantThreads.userId, userId)
      ),
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ data: thread });
  } catch (error) {
    console.error("Get thread error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, tenantId } = authResult.context;
    const { threadId } = await params;

    // Verify thread belongs to user and tenant before deleting
    const thread = await db.query.assistantThreads.findFirst({
      where: and(
        eq(schema.assistantThreads.id, threadId),
        eq(schema.assistantThreads.tenantId, tenantId),
        eq(schema.assistantThreads.userId, userId)
      ),
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Delete thread (messages will cascade)
    await db
      .delete(schema.assistantThreads)
      .where(eq(schema.assistantThreads.id, threadId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete thread error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
