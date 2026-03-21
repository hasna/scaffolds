import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const scoreSchema = z.object({
  submissionId: z.string().uuid(),
  score: z.number().int().min(1).max(10),
  feedback: z.string().max(2000).optional().nullable(),
});

// POST /api/v1/scores — submit or update a score (judges only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { submissionId, score, feedback } = parsed.data;
  const judgeId = session.user.id;

  // Find the submission
  const submission = await db.query.submissions.findFirst({
    where: eq(schema.submissions.id, submissionId),
    with: {
      competition: {
        columns: { id: true, status: true },
        with: {
          judges: {
            columns: { userId: true },
          },
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Check judge is registered for this competition or is admin
  const isAdmin = session.user.role === "admin" || session.user.role === "super_admin";
  const isJudge = submission.competition.judges.some((j) => j.userId === judgeId);

  if (!isAdmin && !isJudge) {
    return NextResponse.json(
      { error: "Only judges can score submissions" },
      { status: 403 }
    );
  }

  // Check competition is in judging phase (or admin override)
  if (!isAdmin && submission.competition.status !== "judging") {
    return NextResponse.json(
      { error: "Scoring is only available during the judging phase" },
      { status: 409 }
    );
  }

  // Upsert score (one per judge per submission)
  const existing = await db.query.scores.findFirst({
    where: and(
      eq(schema.scores.submissionId, submissionId),
      eq(schema.scores.judgeId, judgeId)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(schema.scores)
      .set({ score, feedback: feedback ?? null })
      .where(eq(schema.scores.id, existing.id))
      .returning();
    return NextResponse.json({ score: updated });
  }

  const [created] = await db
    .insert(schema.scores)
    .values({
      submissionId,
      judgeId,
      score,
      feedback: feedback ?? null,
    })
    .returning();

  return NextResponse.json({ score: created }, { status: 201 });
}

// GET /api/v1/scores?submissionId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissionId = req.nextUrl.searchParams.get("submissionId");
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 422 });
  }

  const scores = await db.query.scores.findMany({
    where: eq(schema.scores.submissionId, submissionId),
    with: {
      judge: { columns: { name: true, email: true } },
    },
  });

  return NextResponse.json({ scores });
}
