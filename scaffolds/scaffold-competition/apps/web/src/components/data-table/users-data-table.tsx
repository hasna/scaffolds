"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "./data-table";
import { DataTableColumnHeader } from "./column-header";
import { Trash2, Download } from "lucide-react";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name || "—"}</div>
        <div className="text-sm text-muted-foreground">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ row }) => (
      <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: "emailVerifiedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={row.original.emailVerifiedAt ? "outline" : "destructive"}>
        {row.original.emailVerifiedAt ? "Verified" : "Unverified"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

interface UsersDataTableProps {
  data: User[];
  onDelete?: (users: User[]) => void;
  onExport?: (users: User[]) => void;
}

export function UsersDataTable({ data, onDelete, onExport }: UsersDataTableProps) {
  const bulkActions = [];

  if (onExport) {
    bulkActions.push({
      label: "Export",
      icon: <Download className="mr-2 h-4 w-4" />,
      onClick: onExport,
    });
  }

  if (onDelete) {
    bulkActions.push({
      label: "Delete",
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: onDelete,
      variant: "destructive" as const,
    });
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search users..."
      bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
    />
  );
}
