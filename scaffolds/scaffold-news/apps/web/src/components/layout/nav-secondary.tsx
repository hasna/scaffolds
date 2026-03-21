"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface NavSecondaryProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}

export function NavSecondary({ items, ...props }: NavSecondaryProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.url as Route}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton asChild>
              <label className="cursor-pointer">
                {resolvedTheme === "dark" ? <Moon /> : <Sun />}
                <span>Dark Mode</span>
                {mounted ? (
                  <Switch
                    className="ml-auto"
                    checked={resolvedTheme === "dark"}
                    onCheckedChange={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  />
                ) : (
                  <Skeleton className="ml-auto h-4 w-8 rounded-full" />
                )}
              </label>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
