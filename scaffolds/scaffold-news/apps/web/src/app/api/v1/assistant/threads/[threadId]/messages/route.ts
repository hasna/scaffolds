import { NextRequest, NextResponse } from "next/server";
import { getApiContext, type RouteContext } from "@/lib/api-context";
import { getThreadMessages } from "@/lib/ai";
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

    // Verify thread ownership and tenant isolation
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

    const messages = await getThreadMessages(threadId);

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
