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
  Download,
  ExternalLink,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";

export interface Invoice {
  id: string;
  number: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  description?: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  invoiceUrl?: string;
  pdfUrl?: string;
}

interface InvoicesDataTableProps {
  data: Invoice[];
  onDownload?: (invoice: Invoice) => void;
  onView?: (invoice: Invoice) => void;
  onRetry?: (invoice: Invoice) => void;
  onBulkDownload?: (invoices: Invoice[]) => void;
}

const statusColors: Record<Invoice["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  open: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  void: "bg-red-100 text-red-800",
  uncollectible: "bg-red-100 text-red-800",
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export function InvoicesDataTable({
  data,
  onDownload,
  onView,
  onRetry,
  onBulkDownload,
}: InvoicesDataTableProps) {
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Invoice" />
      ),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium font-mono">{invoice.number}</div>
              {invoice.description && (
                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {invoice.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div>
            <div className="font-medium">{invoice.customerName}</div>
            <div className="text-sm text-muted-foreground">
              {invoice.customerEmail}
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
        const status = row.getValue("status") as Invoice["status"];
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
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <span className="font-medium">
            {formatCurrency(invoice.amount, invoice.currency)}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return (
          <span className="text-sm text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("dueDate") as Date | undefined;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-sm text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
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
              {invoice.invoiceUrl && (
                <DropdownMenuItem onClick={() => onView?.(invoice)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Invoice
                </DropdownMenuItem>
              )}
              {invoice.pdfUrl && (
                <DropdownMenuItem onClick={() => onDownload?.(invoice)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
              )}
              {(invoice.status === "open" ||
                invoice.status === "uncollectible") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onRetry?.(invoice)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Payment
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
      searchKey="number"
      searchPlaceholder="Search invoices..."
      bulkActions={[
        {
          label: "Download PDFs",
          onClick: (rows) => onBulkDownload?.(rows),
        },
      ]}
    />
  );
}
