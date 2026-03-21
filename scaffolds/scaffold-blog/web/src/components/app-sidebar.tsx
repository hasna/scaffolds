import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Bot,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Tags,
  Users,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

export function AppSidebar({
  user,
  onLogout,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar?: string | null }
  onLogout: () => void
}) {
  const location = useLocation()

  const items = [
    { title: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { title: "Posts", to: "/admin/posts", icon: FileText },
    { title: "Pages", to: "/admin/pages", icon: FileText },
    { title: "Categories", to: "/admin/categories", icon: FolderOpen },
    { title: "Tags", to: "/admin/tags", icon: Tags },
    { title: "Comments", to: "/admin/comments", icon: MessageSquare },
    { title: "Media", to: "/admin/media", icon: ImageIcon },
    { title: "AI", to: "/admin/ai", icon: Bot },
    { title: "Users", to: "/admin/users", icon: Users },
    { title: "Settings", to: "/admin/settings", icon: Settings },
  ] as const

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Admin">
              <Link to="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Engine Blog</span>
                  <span className="truncate text-xs">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => {
              const isActive =
                item.to === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname.startsWith(item.to)

              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
