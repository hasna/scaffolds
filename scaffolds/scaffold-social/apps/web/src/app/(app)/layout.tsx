"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Home, Bell, PlusSquare, User, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const username = (session.user as { username?: string })?.username ?? session.user?.name ?? "me";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar nav */}
      <nav className="fixed left-0 top-0 flex h-screen w-16 flex-col items-center gap-6 border-r bg-background py-6 lg:w-56 lg:items-start lg:px-4">
        <Link href="/feed" className="mb-4 flex items-center gap-3 font-bold text-xl px-1">
          <span className="text-primary">◈</span>
          <span className="hidden lg:block">Social</span>
        </Link>
        <NavItem href="/feed" icon={<Home className="h-5 w-5" />} label="Feed" />
        <NavItem href="/notifications" icon={<Bell className="h-5 w-5" />} label="Notifications" />
        <NavItem href="/compose" icon={<PlusSquare className="h-5 w-5" />} label="Post" />
        <NavItem
          href={`/profile/${username}`}
          icon={<User className="h-5 w-5" />}
          label="Profile"
        />
        <div className="mt-auto">
          <Button
            variant="ghost"
            className="flex w-full items-center gap-3 justify-center lg:justify-start"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden lg:block">Sign out</span>
          </Button>
        </div>
      </nav>

      {/* Main content */}
      <main className="ml-16 flex-1 lg:ml-56">
        <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground justify-center lg:justify-start"
    >
      {icon}
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}
