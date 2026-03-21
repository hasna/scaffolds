import { NextRequest, NextResponse } from "next/server";
import { getApiContext } from "@/lib/api-context";
import { createThread, getUserThreads } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, tenantId } = authResult.context;
    const threads = await getUserThreads(userId, tenantId);

    return NextResponse.json({ data: threads });
  } catch (error) {
    console.error("Get threads error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, tenantId } = authResult.context;
    const thread = await createThread(tenantId, userId);

    return NextResponse.json({ data: thread }, { status: 201 });
  } catch (error) {
    console.error("Create thread error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
