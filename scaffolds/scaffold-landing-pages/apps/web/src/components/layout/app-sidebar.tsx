"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  CreditCard,
  Flag,
  Folder,
  HelpCircle,
  Home,
  Key,
  Search,
  Settings,
  Users,
  Webhook,
  Building2,
  Activity,
  type LucideIcon,
} from "lucide-react";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { NavAdmin } from "./nav-admin";
import { TenantSwitcher } from "./tenant-switcher";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavAdminItem {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: { title: string; url: string }[];
}

const navMainItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "API Keys", url: "/dashboard/api-keys", icon: Key },
  { title: "Webhooks", url: "/dashboard/webhooks", icon: Webhook },
  { title: "Team", url: "/dashboard/team", icon: Users },
  { title: "Billing", url: "/dashboard/billing", icon: CreditCard },
];

const navAdminItems: NavAdminItem[] = [
  { title: "Overview", url: "/admin", icon: Activity },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Tenants", url: "/admin/tenants", icon: Building2 },
  { title: "Feature Flags", url: "/admin/feature-flags", icon: Flag },
  {
    title: "Marketing",
    url: "/admin/marketing",
    icon: Folder,
    items: [
      { title: "Pages", url: "/admin/marketing/pages" },
      { title: "Blog", url: "/admin/marketing/blog" },
      { title: "Changelog", url: "/admin/marketing/changelog" },
      { title: "Docs", url: "/admin/marketing/docs" },
    ],
  },
];

const navSecondaryItems: NavItem[] = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
  { title: "Get Help", url: "/help", icon: HelpCircle },
  { title: "Search", url: "#", icon: Search },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();

  const user = session?.user
    ? {
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        avatar: session.user.image ?? "",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "",
      };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavAdmin items={navAdminItems} label="Admin" />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
