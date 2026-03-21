"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, LogOut, UserPlus, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function TeamManagementPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleJoinOrCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const teamName = formData.get("teamName") as string;

    try {
      const res = await fetch(`/api/v1/competitions/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Team created/joined successfully!");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsInviting(true);
    try {
      const res = await fetch(`/api/v1/competitions/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Are you sure you want to leave this team?")) return;
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/v1/competitions/${slug}/join`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      toast.success("Left the team");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <p className="text-muted-foreground text-sm">Competition: {slug}</p>
        </div>
        <h1 className="text-2xl font-bold">Team Management</h1>
      </div>

      {/* Create or join a team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create or Join a Team
          </CardTitle>
          <CardDescription>
            Enter an existing team name to join it, or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinOrCreate} className="flex gap-2">
            <Input
              name="teamName"
              placeholder="Team name..."
              required
              className="flex-1"
            />
            <Button type="submit">
              <UserPlus className="mr-2 h-4 w-4" />
              Join / Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invite a member */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Add a member to your team by email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={isInviting}>
              {isInviting ? "Inviting..." : "Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Leave team */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={isLeaving}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLeaving ? "Leaving..." : "Leave Team"}
          </Button>
          <p className="text-muted-foreground mt-2 text-xs">
            This will remove you from the team. If you are the leader, the team may be dissolved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
