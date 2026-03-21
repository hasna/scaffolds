import { requireAuth } from "@/lib/auth-utils";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — My Pages",
};

export default async function DashboardPage() {
  const session = await requireAuth();

  const pages = await db.query.pages.findMany({
    where: eq(schema.pages.ownerId, session.user.id),
    orderBy: [desc(schema.pages.createdAt)],
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Pages</h1>
          <p className="mt-1 text-slate-600">Manage your landing pages and view analytics.</p>
        </div>
        <Link
          href="/dashboard/pages/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          + New Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <p className="mb-4 text-slate-500">You don&apos;t have any pages yet.</p>
          <Link
            href="/dashboard/pages/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create your first page
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    page.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {page.status}
                </span>
                <span className="text-sm text-slate-400">{page.viewCount} views</span>
              </div>
              <h2 className="mb-1 text-lg font-semibold text-slate-900">{page.title}</h2>
              <p className="mb-4 text-sm text-slate-500">/{page.slug}</p>
              {page.description && (
                <p className="mb-4 line-clamp-2 text-sm text-slate-600">{page.description}</p>
              )}
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/pages/${page.id}/edit`}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </Link>
                {page.status === "published" && (
                  <a
                    href={`/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg bg-slate-900 py-1.5 text-center text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
