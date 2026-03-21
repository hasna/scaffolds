"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Map routes to readable names
const routeNames: Record<string, string> = {
  dashboard: "Dashboard",
  team: "Team",
  billing: "Billing",
  webhooks: "Webhooks",
  "api-keys": "API Keys",
  analytics: "Analytics",
  settings: "Settings",
  admin: "Admin",
  users: "Users",
  tenants: "Tenants",
  "feature-flags": "Feature Flags",
  marketing: "Marketing",
  blog: "Blog",
  changelog: "Changelog",
  docs: "Docs",
  pages: "Pages",
  health: "Health",
  new: "New",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { name: string; href: string; isLast: boolean }[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const name = routeNames[segment] || segment;
    breadcrumbs.push({
      name,
      href: currentPath,
      isLast: index === segments.length - 1,
    });
  });

  return breadcrumbs;
}

export function SiteHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.name}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
