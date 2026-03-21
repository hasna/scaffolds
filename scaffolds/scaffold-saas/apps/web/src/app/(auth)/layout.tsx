import Link from "next/link";
import type { Route } from "next";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-14 items-center">
        <Link href={"/" as Route} className="font-semibold">
          SaaS Scaffold
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
