import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z
    .string()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  rules: z.string().min(5),
  prizes: z.string().min(5),
  status: z.enum(["draft", "open", "judging", "closed"]).default("draft"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  submissionDeadline: z.string().datetime(),
  maxTeamSize: z.number().int().min(1).max(50).default(4),
  bannerImage: z.string().url().optional().nullable(),
});

// GET /api/v1/competitions — list open competitions
export async function GET() {
  const competitions = await db.query.competitions.findMany({
    where: eq(schema.competitions.status, "open"),
    orderBy: [desc(schema.competitions.startDate)],
    with: { teams: { columns: { id: true } } },
  });

  return NextResponse.json({ competitions });
}

// POST /api/v1/competitions — create competition (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin =
    session.user.role === "admin" || session.user.role === "super_admin";
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Check slug uniqueness
  const existing = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, data.slug),
    columns: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const [competition] = await db
    .insert(schema.competitions)
    .values({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      submissionDeadline: new Date(data.submissionDeadline),
      organizerId: session.user.id,
      bannerImage: data.bannerImage ?? null,
    })
    .returning();

  return NextResponse.json({ competition }, { status: 201 });
}
