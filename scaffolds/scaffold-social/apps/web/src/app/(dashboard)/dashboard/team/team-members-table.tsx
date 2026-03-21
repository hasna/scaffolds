"use client";

import { useState } from "react";
import { MoreHorizontal, Shield, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  role: "member" | "manager" | "owner";
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface TeamMembersTableProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole?: "member" | "manager" | "owner";
}

const roleColors = {
  owner: "default",
  manager: "secondary",
  member: "outline",
} as const;

export function TeamMembersTable({
  members,
  currentUserId,
  currentUserRole,
}: TeamMembersTableProps) {
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canManage = currentUserRole === "owner" || currentUserRole === "manager";

  async function handleRemoveMember() {
    if (!removingMember) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/team/members?memberId=${removingMember.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      toast.success("Member removed successfully");
      setRemovingMember(null);
      window.location.reload();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangeRole(memberId: string, newRole: "member" | "manager") {
    try {
      const response = await fetch("/api/v1/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      toast.success("Role updated successfully");
      window.location.reload();
    } catch {
      toast.error("Failed to update role");
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {canManage && <TableHead className="w-[70px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.avatarUrl ?? undefined} />
                      <AvatarFallback>
                        {member.user.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.user.name ?? "Unknown"}
                        {member.user.id === currentUserId && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleColors[member.role]}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </TableCell>
                {canManage && (
                  <TableCell>
                    {member.role !== "owner" && member.user.id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {currentUserRole === "owner" && (
                            <>
                              {member.role === "member" && (
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member.id, "manager")}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make Manager
                                </DropdownMenuItem>
                              )}
                              {member.role === "manager" && (
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member.id, "member")}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setRemovingMember(member)}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removingMember?.user.name ?? removingMember?.user.email} from the team?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isLoading}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
