import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const joinSchema = z.object({
  teamName: z.string().min(1).max(100).optional(),
  inviteEmail: z.string().email().optional(),
});

// POST /api/v1/competitions/[slug]/join
// Creates a team (if teamName doesn't exist) or joins an existing one
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { teamName, inviteEmail } = parsed.data;

  // Find competition
  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
  });

  if (!comp) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  if (comp.status !== "open") {
    return NextResponse.json(
      { error: "This competition is not accepting entries" },
      { status: 409 }
    );
  }

  const userId = session.user.id;

  // Handle invite flow
  if (inviteEmail) {
    // Find the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.email, inviteEmail),
      columns: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `No user found with email ${inviteEmail}` },
        { status: 404 }
      );
    }

    // Find the current user's team in this competition
    const currentMembership = await db.query.teamMembers.findFirst({
      where: eq(schema.teamMembers.userId, userId),
      with: {
        team: {
          where: eq(schema.teams.competitionId, comp.id),
        },
      },
    });

    if (!currentMembership?.team) {
      return NextResponse.json(
        { error: "You must be in a team before inviting members" },
        { status: 409 }
      );
    }

    const team = currentMembership.team;

    // Check team size limit
    const memberCount = await db.query.teamMembers.findMany({
      where: eq(schema.teamMembers.teamId, team.id),
    });

    if (memberCount.length >= comp.maxTeamSize) {
      return NextResponse.json(
        { error: `Team is full (max ${comp.maxTeamSize} members)` },
        { status: 409 }
      );
    }

    // Check if already a member
    const alreadyMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(schema.teamMembers.teamId, team.id),
        eq(schema.teamMembers.userId, targetUser.id)
      ),
    });

    if (alreadyMember) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
    }

    await db.insert(schema.teamMembers).values({
      teamId: team.id,
      userId: targetUser.id,
      role: "member",
    });

    return NextResponse.json({ success: true, message: `${targetUser.name ?? inviteEmail} added to team` });
  }

  // Handle join/create team flow
  if (!teamName) {
    return NextResponse.json(
      { error: "teamName or inviteEmail is required" },
      { status: 422 }
    );
  }

  // Check if the user already has a team in this competition
  const existingTeam = await db.query.teams.findFirst({
    where: and(
      eq(schema.teams.competitionId, comp.id),
      eq(schema.teams.leaderId, userId)
    ),
  });

  if (existingTeam) {
    return NextResponse.json(
      { error: "You are already leading a team in this competition" },
      { status: 409 }
    );
  }

  // Try to find an existing team by name
  const existingByName = await db.query.teams.findFirst({
    where: and(
      eq(schema.teams.competitionId, comp.id),
      eq(schema.teams.name, teamName)
    ),
    with: { members: true },
  });

  if (existingByName) {
    // Join existing team
    const alreadyMember = existingByName.members.some((m) => m.userId === userId);
    if (alreadyMember) {
      return NextResponse.json({ error: "You are already in this team" }, { status: 409 });
    }
    if (existingByName.members.length >= comp.maxTeamSize) {
      return NextResponse.json(
        { error: `Team is full (max ${comp.maxTeamSize} members)` },
        { status: 409 }
      );
    }

    await db.insert(schema.teamMembers).values({
      teamId: existingByName.id,
      userId,
      role: "member",
    });

    return NextResponse.json({ success: true, teamId: existingByName.id, action: "joined" });
  }

  // Create new team
  const [newTeam] = await db
    .insert(schema.teams)
    .values({
      competitionId: comp.id,
      name: teamName,
      leaderId: userId,
    })
    .returning();

  await db.insert(schema.teamMembers).values({
    teamId: newTeam.id,
    userId,
    role: "leader",
  });

  return NextResponse.json({ success: true, teamId: newTeam.id, action: "created" }, { status: 201 });
}

// DELETE /api/v1/competitions/[slug]/join — leave your team
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const userId = session.user.id;

  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
    columns: { id: true },
  });

  if (!comp) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Find user's team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(schema.teamMembers.userId, userId),
    with: {
      team: {
        where: eq(schema.teams.competitionId, comp.id),
      },
    },
  });

  if (!membership?.team) {
    return NextResponse.json({ error: "You are not in a team for this competition" }, { status: 404 });
  }

  await db
    .delete(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, membership.team.id),
        eq(schema.teamMembers.userId, userId)
      )
    );

  return NextResponse.json({ success: true });
}
