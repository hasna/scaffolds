import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ResumeContent, PersonalInfo, ContactInfo } from "@scaffold-review/types";

const createResumeSchema = z.object({
  title: z.string().min(1).max(255),
  isMaster: z.boolean().optional().default(false),
  template: z
    .enum(["modern", "classic", "minimal", "professional", "creative"])
    .optional()
    .default("modern"),
  contact: z
    .object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      location: z.string().optional(),
      linkedinUrl: z.string().optional(),
      githubUrl: z.string().optional(),
      websiteUrl: z.string().optional(),
    })
    .optional(),
});

function createDefaultContent(contact?: PersonalInfo): ResumeContent {
  return {
    personalInfo: contact || {
      fullName: "",
      email: "",
    },
    summary: "",
    sections: [
      {
        id: nanoid(),
        type: "experience",
        title: "Work Experience",
        visible: true,
        order: 0,
        content: [],
      },
      {
        id: nanoid(),
        type: "education",
        title: "Education",
        visible: true,
        order: 1,
        content: [],
      },
      {
        id: nanoid(),
        type: "skills",
        title: "Skills",
        visible: true,
        order: 2,
        content: [],
      },
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const masterOnly = searchParams.get("master") === "true";
    const variantOf = searchParams.get("variant_of");

    let whereConditions = and(
      eq(schema.resumes.tenantId, tenantId),
      eq(schema.resumes.userId, session.user.id),
      isNull(schema.resumes.deletedAt)
    );

    if (masterOnly) {
      whereConditions = and(whereConditions, eq(schema.resumes.isMaster, true));
    }

    if (variantOf) {
      whereConditions = and(whereConditions, eq(schema.resumes.parentResumeId, variantOf));
    }

    const userResumes = await db.query.resumes.findMany({
      where: whereConditions,
      orderBy: [desc(schema.resumes.updatedAt)],
    });

    return NextResponse.json({
      success: true,
      data: userResumes,
    });
  } catch (error) {
    console.error("Get resumes error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

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
    const parsed = createResumeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, isMaster, template, contact } = parsed.data;

    const content = createDefaultContent(contact as ContactInfo | undefined);

    const [resume] = await db
      .insert(schema.resumes)
      .values({
        tenantId,
        userId: session.user.id,
        title,
        isMaster,
        template,
        content,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: resume,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create resume error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
