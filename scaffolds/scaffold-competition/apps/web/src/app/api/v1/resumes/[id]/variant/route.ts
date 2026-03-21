import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeContent } from "@scaffold-competition/types";

const createVariantSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  targetJobTitle: z.string().max(255).optional(),
  targetJobUrl: z.string().url().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { id } = await params;

    // Get master resume
    const master = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, id),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!master) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const body = await _request.json();
    const parsed = createVariantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, targetJobTitle, targetJobUrl } = parsed.data;

    // Create variant linked to master
    const [variant] = await db
      .insert(schema.resumes)
      .values({
        tenantId,
        userId: session.user.id,
        title: title || `${master.title} - Variant`,
        slug: null,
        isPublic: false,
        isMaster: false,
        parentResumeId: id,
        targetJobTitle: targetJobTitle || null,
        targetJobUrl: targetJobUrl || null,
        content: master.content as ResumeContent,
        template: master.template,
        theme: master.theme,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: variant,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create variant error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
