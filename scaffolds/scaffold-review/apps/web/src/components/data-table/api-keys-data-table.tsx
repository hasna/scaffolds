"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from ".";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Key, Trash2, Copy, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

export interface APIKey {
  id: string;
  name: string;
  key: string; // Masked key (e.g., sk_live_...xxxx)
  prefix: string;
  scopes: string[];
  status: "active" | "revoked" | "expired";
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
}

interface APIKeysDataTableProps {
  data: APIKey[];
  onRevoke?: (apiKey: APIKey) => void;
  onRegenerate?: (apiKey: APIKey) => void;
  onBulkRevoke?: (apiKeys: APIKey[]) => void;
}

const statusColors: Record<APIKey["status"], string> = {
  active: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

export function APIKeysDataTable({
  data,
  onRevoke,
  onRegenerate,
  onBulkRevoke,
}: APIKeysDataTableProps) {
  const columns: ColumnDef<APIKey>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const apiKey = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium">{apiKey.name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {apiKey.key}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as APIKey["status"];
        return (
          <Badge variant="outline" className={statusColors[status]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "scopes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scopes" />
      ),
      cell: ({ row }) => {
        const scopes = row.getValue("scopes") as string[];
        const displayScopes = scopes.slice(0, 2);
        const remaining = scopes.length - 2;
        return (
          <div className="flex flex-wrap gap-1">
            {displayScopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="text-xs">
                {scope}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{remaining}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "lastUsedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Used" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("lastUsedAt") as Date | undefined;
        if (!date) {
          return <span className="text-muted-foreground text-sm">Never</span>;
        }
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        );
      },
    },
    {
      accessorKey: "expiresAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expires" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("expiresAt") as Date | undefined;
        if (!date) {
          return <span className="text-muted-foreground text-sm">Never</span>;
        }
        const isExpired = date < new Date();
        return (
          <span
            className={`text-sm ${isExpired ? "text-red-600" : "text-muted-foreground"}`}
          >
            {format(date, "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const apiKey = row.original;
        return (
          <div className="text-sm">
            <div className="text-muted-foreground">
              {format(apiKey.createdAt, "MMM d, yyyy")}
            </div>
            <div className="text-xs text-muted-foreground">
              by {apiKey.createdBy}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const apiKey = row.original;
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
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard.writeText(apiKey.key);
                  toast.success("API key copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Key
              </DropdownMenuItem>
              {apiKey.status === "active" && (
                <>
                  <DropdownMenuItem onClick={() => onRegenerate?.(apiKey)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRevoke?.(apiKey)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Revoke
                  </DropdownMenuItem>
                </>
              )}
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
      searchPlaceholder="Search API keys..."
      bulkActions={[
        {
          label: "Revoke",
          onClick: (rows) => onBulkRevoke?.(rows),
          variant: "destructive",
          requireConfirmation: true,
          confirmTitle: "Revoke API Keys",
          confirmDescription: "Are you sure you want to revoke these API keys? This action cannot be undone.",
        },
      ]}
    />
  );
}
