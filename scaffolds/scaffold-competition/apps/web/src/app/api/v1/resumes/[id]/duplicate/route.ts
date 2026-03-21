import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeContent } from "@scaffold-competition/types";

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

    // Get original resume
    const original = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, id),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!original) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Create duplicate
    const [duplicate] = await db
      .insert(schema.resumes)
      .values({
        tenantId,
        userId: session.user.id,
        title: `${original.title} (Copy)`,
        slug: null,
        isPublic: false,
        isMaster: false,
        parentResumeId: null,
        targetJobTitle: original.targetJobTitle,
        targetJobUrl: original.targetJobUrl,
        content: original.content as ResumeContent,
        template: original.template,
        theme: original.theme,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: duplicate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Duplicate resume error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
