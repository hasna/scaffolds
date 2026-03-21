import { ReactNode, useMemo } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isLoading, logout, user } = useAuth()
  const location = useLocation()

  // All hooks must be called before any conditional returns
  const breadcrumb = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    // /admin, /admin/posts, /admin/posts/new, etc.
    const section = parts[1] || 'admin'
    const detail = parts[2] || null

    const labels: Record<string, string> = {
      admin: 'Dashboard',
      posts: 'Posts',
      pages: 'Pages',
      categories: 'Categories',
      tags: 'Tags',
      comments: 'Comments',
      media: 'Media',
      ai: 'AI',
      users: 'Users',
      settings: 'Settings',
    }

    const sectionLabel = labels[section] || section
    const detailLabel =
      detail === null
        ? null
        : detail === 'new'
          ? 'New'
          : detail === 'edit'
            ? 'Edit'
            : detail

    return { section, sectionLabel, detailLabel }
  }, [location.pathname])

  const displayUser = {
    name: user?.name || 'Admin',
    email: user?.email || '',
    avatar: null,
  }

  // Conditional returns must come after all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        user={displayUser}
        onLogout={() => {
          logout()
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <SidebarSeparator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/admin">Admin</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{breadcrumb.sectionLabel}</BreadcrumbPage>
              </BreadcrumbItem>
              {breadcrumb.detailLabel && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{breadcrumb.detailLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto hidden md:flex">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View site
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
