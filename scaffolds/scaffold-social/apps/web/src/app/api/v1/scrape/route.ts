import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { scrapingExecutors } from "@/lib/ai/tools/executors";
import type { ToolContext } from "@/lib/ai/tools/types";

const scrapeSchema = z.object({
  url: z.string().url(),
  extractType: z.enum(["profile", "job_posting", "general"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = scrapeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const context: ToolContext = {
      userId: session.user.id,
      tenantId,
    };

    const result = await scrapingExecutors.scrape_url(parsed.data, context);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Scraping failed" }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
