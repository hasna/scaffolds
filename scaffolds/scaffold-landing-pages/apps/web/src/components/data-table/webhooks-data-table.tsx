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
import {
  MoreHorizontal,
  Webhook,
  Edit,
  Trash2,
  TestTube,
  RefreshCw,
  Eye,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: "active" | "inactive" | "failed";
  secret: string;
  lastDelivery?: {
    status: "success" | "failed";
    timestamp: Date;
    statusCode?: number;
  };
  deliveryCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhooksDataTableProps {
  data: WebhookEndpoint[];
  onEdit?: (webhook: WebhookEndpoint) => void;
  onDelete?: (webhook: WebhookEndpoint) => void;
  onTest?: (webhook: WebhookEndpoint) => void;
  onViewLogs?: (webhook: WebhookEndpoint) => void;
  onRegenerateSecret?: (webhook: WebhookEndpoint) => void;
  onBulkDelete?: (webhooks: WebhookEndpoint[]) => void;
}

const statusColors: Record<WebhookEndpoint["status"], string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

export function WebhooksDataTable({
  data,
  onEdit,
  onDelete,
  onTest,
  onViewLogs,
  onRegenerateSecret,
  onBulkDelete,
}: WebhooksDataTableProps) {
  const columns: ColumnDef<WebhookEndpoint>[] = [
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Endpoint" />
      ),
      cell: ({ row }) => {
        const webhook = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
              <Webhook className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[300px]">
              <div className="font-medium font-mono text-sm truncate">
                {webhook.url}
              </div>
              <div className="text-xs text-muted-foreground">
                {webhook.events.length} events
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
        const status = row.getValue("status") as WebhookEndpoint["status"];
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
      accessorKey: "events",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Events" />
      ),
      cell: ({ row }) => {
        const events = row.getValue("events") as string[];
        const displayEvents = events.slice(0, 2);
        const remaining = events.length - 2;
        return (
          <div className="flex flex-wrap gap-1">
            {displayEvents.map((event) => (
              <Badge key={event} variant="secondary" className="text-xs">
                {event}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{remaining} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "deliveryCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deliveries" />
      ),
      cell: ({ row }) => {
        const webhook = row.original;
        return (
          <div className="text-sm">
            <span className="text-green-600">{webhook.deliveryCount}</span>
            {webhook.failureCount > 0 && (
              <>
                {" / "}
                <span className="text-red-600">{webhook.failureCount}</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "lastDelivery",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Delivery" />
      ),
      cell: ({ row }) => {
        const webhook = row.original;
        if (!webhook.lastDelivery) {
          return <span className="text-muted-foreground text-sm">Never</span>;
        }
        return (
          <div className="text-sm">
            <Badge
              variant="outline"
              className={
                webhook.lastDelivery.status === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {webhook.lastDelivery.statusCode ?? webhook.lastDelivery.status}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(webhook.lastDelivery.timestamp, {
                addSuffix: true,
              })}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const webhook = row.original;
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
              <DropdownMenuItem onClick={() => onEdit?.(webhook)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewLogs?.(webhook)}>
                <Eye className="mr-2 h-4 w-4" />
                View Logs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTest?.(webhook)}>
                <TestTube className="mr-2 h-4 w-4" />
                Send Test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard.writeText(webhook.secret);
                  toast.success("Secret copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Secret
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerateSecret?.(webhook)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Secret
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(webhook)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
      searchKey="url"
      searchPlaceholder="Search webhooks..."
      bulkActions={[
        {
          label: "Delete",
          onClick: (rows) => onBulkDelete?.(rows),
          variant: "destructive",
          requireConfirmation: true,
          confirmTitle: "Delete Webhooks",
          confirmDescription: "Are you sure you want to delete these webhooks? This action cannot be undone.",
        },
      ]}
    />
  );
}
