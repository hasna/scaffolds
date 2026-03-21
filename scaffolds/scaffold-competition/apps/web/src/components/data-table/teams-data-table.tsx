"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from ".";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Users, Settings, Trash2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Team {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  memberCount: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamsDataTableProps {
  data: Team[];
  onView?: (team: Team) => void;
  onManageMembers?: (team: Team) => void;
  onSettings?: (team: Team) => void;
  onDelete?: (team: Team) => void;
  onBulkDelete?: (teams: Team[]) => void;
}

const planColors: Record<Team["plan"], string> = {
  free: "bg-gray-100 text-gray-800",
  starter: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
};

export function TeamsDataTable({
  data,
  onView,
  onManageMembers,
  onSettings,
  onDelete,
  onBulkDelete,
}: TeamsDataTableProps) {
  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium">{team.name}</div>
              <div className="text-sm text-muted-foreground">/{team.slug}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "plan",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Plan" />
      ),
      cell: ({ row }) => {
        const plan = row.getValue("plan") as Team["plan"];
        return (
          <Badge variant="outline" className={planColors[plan]}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "memberCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("memberCount") as number;
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "ownerName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Owner" />
      ),
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={team.ownerAvatar} alt={team.ownerName} />
              <AvatarFallback>
                {team.ownerName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{team.ownerName}</div>
              <div className="text-xs text-muted-foreground">
                {team.ownerEmail}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView?.(team)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageMembers?.(team)}>
                <Users className="mr-2 h-4 w-4" />
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSettings?.(team)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(team)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search teams..."
      bulkActions={[
        {
          label: "Delete",
          onClick: (rows) => onBulkDelete?.(rows),
          variant: "destructive",
          requireConfirmation: true,
          confirmTitle: "Delete Teams",
          confirmDescription: "Are you sure you want to delete these teams? This action cannot be undone.",
        },
      ]}
    />
  );
}
