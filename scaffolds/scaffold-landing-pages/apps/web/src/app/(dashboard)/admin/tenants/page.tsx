"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Trash2, Users, Loader2 } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  stripeCustomerId: string | null;
  createdAt: string;
  memberCount: number;
  subscription: {
    status: string;
    plan: {
      name: string;
    } | null;
  } | null;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const response = await fetch("/api/admin/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(tenantId: string) {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTenants();
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(search.toLowerCase())
  );

  function getStatusVariant(
    status: string | undefined
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "active":
        return "default";
      case "trialing":
        return "secondary";
      case "canceled":
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground">Manage all tenant organizations in the system.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-muted-foreground text-sm">{tenant.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="text-muted-foreground h-4 w-4" />
                      {tenant.memberCount}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tenant.subscription?.plan?.name || "Free"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(tenant.subscription?.status)}>
                      {tenant.subscription?.status || "No subscription"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDelete(tenant.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                    No tenants found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
