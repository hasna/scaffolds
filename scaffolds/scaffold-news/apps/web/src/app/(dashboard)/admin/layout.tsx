import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1">
      <div className="bg-muted/50 border-b px-6 py-3">
        <h2 className="text-muted-foreground text-sm font-medium">Admin Panel</h2>
      </div>
      {children}
    </div>
  );
}
