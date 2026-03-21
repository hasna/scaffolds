import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const submissionSchema = z.object({
  competitionSlug: z.string().min(1),
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  projectUrl: z.string().url(),
  demoUrl: z.string().url().optional().nullable(),
  repoUrl: z.string().url().optional().nullable(),
  draft: z.boolean().default(false),
});

// POST /api/v1/submissions — create or update submission for the session user's team
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { competitionSlug, title, description, projectUrl, demoUrl, repoUrl, draft } = parsed.data;
  const userId = session.user.id;

  // Find competition
  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, competitionSlug),
  });

  if (!comp) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Check deadline (can still save drafts after deadline; only submit is blocked)
  const pastDeadline = new Date() > new Date(comp.submissionDeadline);
  if (!draft && pastDeadline) {
    return NextResponse.json({ error: "Submission deadline has passed" }, { status: 409 });
  }

  // Find user's team in this competition
  const membership = await db.query.teamMembers.findFirst({
    where: eq(schema.teamMembers.userId, userId),
    with: {
      team: {
        where: eq(schema.teams.competitionId, comp.id),
      },
    },
  });

  if (!membership?.team) {
    return NextResponse.json(
      { error: "You must be in a team to submit" },
      { status: 403 }
    );
  }

  const team = membership.team;

  // Check if submission already exists (upsert)
  const existing = await db.query.submissions.findFirst({
    where: and(
      eq(schema.submissions.teamId, team.id),
      eq(schema.submissions.competitionId, comp.id)
    ),
  });

  const status = draft ? "draft" : "submitted";
  const submittedAt = draft ? null : new Date();

  if (existing) {
    // Only allow edits if not yet approved/disqualified
    if (existing.status === "approved" || existing.status === "disqualified") {
      return NextResponse.json(
        { error: "Cannot edit a finalized submission" },
        { status: 409 }
      );
    }

    const [updated] = await db
      .update(schema.submissions)
      .set({
        title,
        description,
        projectUrl,
        demoUrl: demoUrl ?? null,
        repoUrl: repoUrl ?? null,
        status,
        submittedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.submissions.id, existing.id))
      .returning();

    return NextResponse.json({ submission: updated });
  }

  // Create new
  const [submission] = await db
    .insert(schema.submissions)
    .values({
      teamId: team.id,
      competitionId: comp.id,
      title,
      description,
      projectUrl,
      demoUrl: demoUrl ?? null,
      repoUrl: repoUrl ?? null,
      status,
      submittedAt,
    })
    .returning();

  return NextResponse.json({ submission }, { status: 201 });
}

// GET /api/v1/submissions?competitionSlug=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("competitionSlug");
  if (!slug) {
    return NextResponse.json({ error: "competitionSlug is required" }, { status: 422 });
  }

  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
    columns: { id: true },
  });

  if (!comp) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  const membership = await db.query.teamMembers.findFirst({
    where: eq(schema.teamMembers.userId, session.user.id),
    with: {
      team: {
        where: eq(schema.teams.competitionId, comp.id),
      },
    },
  });

  if (!membership?.team) {
    return NextResponse.json({ submission: null });
  }

  const submission = await db.query.submissions.findFirst({
    where: and(
      eq(schema.submissions.teamId, membership.team.id),
      eq(schema.submissions.competitionId, comp.id)
    ),
  });

  return NextResponse.json({ submission: submission ?? null });
}
