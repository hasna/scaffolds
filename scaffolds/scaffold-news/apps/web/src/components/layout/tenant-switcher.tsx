"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string;
  plan: { name: string } | null;
}

export function TenantSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTenants() {
      try {
        const response = await fetch("/api/v1/tenants", {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setTenants(data.tenants || []);
        }
      } catch (error) {
        // Ignore abort errors (component unmounted during fetch)
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        // Only log in development, don't spam console
        if (process.env.NODE_ENV === "development") {
          console.debug("Tenant fetch error:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (session?.user) {
      void fetchTenants();
    }

    return () => {
      controller.abort();
    };
  }, [session?.user]);

  const currentTenant = tenants.find((t) => t.id === session?.user?.tenantId);

  async function switchTenant(tenantId: string) {
    if (tenantId === session?.user?.tenantId) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      const response = await fetch("/api/v1/tenants/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        // Update session and refresh the page to get new data
        await update();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to switch tenant:", error);
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  }

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-10 w-full" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={switching}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {currentTenant?.avatarUrl ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={currentTenant.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {currentTenant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Building2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentTenant?.name || "Select Team"}
                </span>
                {currentTenant?.plan && (
                  <span className="text-muted-foreground truncate text-xs">
                    {currentTenant.plan.name}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg p-0"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <TenantList
              tenants={tenants}
              currentTenantId={currentTenant?.id}
              onSelect={switchTenant}
              switching={switching}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function TenantList({
  tenants,
  currentTenantId,
  onSelect,
  switching,
}: {
  tenants: Tenant[];
  currentTenantId?: string;
  onSelect: (tenantId: string) => void;
  switching: boolean;
}) {
  const router = useRouter();

  return (
    <Command>
      <CommandInput placeholder="Search teams..." />
      <CommandList>
        <CommandEmpty>No teams found.</CommandEmpty>
        <CommandGroup heading="Teams">
          {tenants.map((tenant) => (
            <CommandItem
              key={tenant.id}
              value={tenant.name}
              onSelect={() => onSelect(tenant.id)}
              disabled={switching}
            >
              <Avatar className="mr-2 h-5 w-5">
                <AvatarImage src={tenant.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">{tenant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="flex items-center gap-2">
                  <span className="truncate">{tenant.name}</span>
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    {tenant.role}
                  </Badge>
                </div>
                {tenant.plan && (
                  <div className="text-muted-foreground text-xs">{tenant.plan.name}</div>
                )}
              </div>
              <Check
                className={cn(
                  "ml-auto h-4 w-4",
                  currentTenantId === tenant.id ? "opacity-100" : "opacity-0"
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem onSelect={() => router.push("/dashboard/settings/team/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create new team
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
