import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ExternalLink, FileText } from "lucide-react";
import { formatCurrency } from "@scaffold-landing-pages/utils";
import type { Invoice } from "@/lib/stripe";

interface InvoiceHistoryProps {
  invoices: Invoice[];
}

export function InvoiceHistory({ invoices }: InvoiceHistoryProps) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>Your past invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No invoices yet. Invoices will appear here after your first payment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
        <CardDescription>Your past invoices and receipts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div className="font-medium">{invoice.number ?? invoice.id.slice(-8)}</div>
                  <div className="text-sm text-muted-foreground">{invoice.description}</div>
                </TableCell>
                <TableCell>
                  {invoice.created.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  {formatCurrency(invoice.amountPaid / 100, invoice.currency.toUpperCase())}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {invoice.hostedInvoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View invoice"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {invoice.invoicePdf && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    paid: "default",
    open: "secondary",
    draft: "outline",
    uncollectible: "destructive",
    void: "destructive",
  };

  return (
    <Badge variant={variants[status ?? "draft"] ?? "secondary"}>
      {status ?? "draft"}
    </Badge>
  );
}
