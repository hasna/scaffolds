import { NextResponse } from "next/server";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";

const StatusSchema = z.object({
  status: z.enum(["draft", "published"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Verify page ownership
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, id),
    });

    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Parse body (support both JSON and form submissions)
    const contentType = request.headers.get("content-type") ?? "";
    let status: string;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as unknown;
      const parsed = StatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid status" }, { status: 422 });
      }
      status = parsed.data.status;
    } else {
      const form = await request.formData();
      status = form.get("status") as string;
      const parsed = StatusSchema.safeParse({ status });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid status" }, { status: 422 });
      }
    }

    const [updated] = await db
      .update(schema.pages)
      .set({ status: status as schema.PageStatus, updatedAt: new Date() })
      .where(eq(schema.pages.id, id))
      .returning();

    // Redirect back if form submission
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(
        new URL(`/dashboard/pages/${id}/edit`, request.url),
        303,
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
