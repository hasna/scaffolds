import { notFound } from "next/navigation";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const page = await db.query.pages.findFirst({ where: eq(schema.pages.id, id) });
  return { title: page ? `Edit: ${page.title}` : "Edit Page" };
}

const SECTION_TYPES: schema.SectionType[] = ["hero", "features", "cta", "pricing", "footer"];

export default async function EditPagePage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();

  const page = await db.query.pages.findFirst({
    where: eq(schema.pages.id, id),
    with: {
      sections: {
        orderBy: [asc(schema.sections.order)],
      },
    },
  });

  if (!page || page.ownerId !== session.user.id) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">{page.title}</h1>
          <p className="mt-1 text-slate-500">
            /{page.slug} ·{" "}
            <span
              className={`font-medium ${
                page.status === "published" ? "text-green-600" : "text-slate-500"
              }`}
            >
              {page.status}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          {page.status === "published" && (
            <a
              href={`/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              View Live ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sections list */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Sections</h2>
          {page.sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500">
              No sections yet. Add one from the sidebar.
            </div>
          ) : (
            <div className="space-y-3">
              {page.sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium capitalize text-slate-900">{section.type}</p>
                    <p className="text-sm text-slate-400">Order: {section.order}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      section.visible
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {section.visible ? "Visible" : "Hidden"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add section sidebar */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Add Section</h2>
          <div className="space-y-2">
            {SECTION_TYPES.map((type) => (
              <AddSectionButton key={type} type={type} pageId={page.id} />
            ))}
          </div>

          <div className="mt-8 space-y-2">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Page Settings</h2>
            <PublishToggle pageId={page.id} currentStatus={page.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AddSectionButton({ type, pageId }: { type: schema.SectionType; pageId: string }) {
  const icons: Record<string, string> = {
    hero: "🎯",
    features: "✨",
    cta: "📣",
    pricing: "💰",
    footer: "📄",
  };

  return (
    <form action={`/api/v1/lander/pages/${pageId}/sections`} method="POST">
      <input type="hidden" name="type" value={type} />
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <span>{icons[type]}</span>
        <span className="capitalize">Add {type} section</span>
      </button>
    </form>
  );
}

function PublishToggle({
  pageId,
  currentStatus,
}: {
  pageId: string;
  currentStatus: schema.PageStatus;
}) {
  const newStatus = currentStatus === "published" ? "draft" : "published";

  return (
    <form action={`/api/v1/lander/pages/${pageId}/status`} method="POST">
      <input type="hidden" name="status" value={newStatus} />
      <button
        type="submit"
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          currentStatus === "published"
            ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {currentStatus === "published" ? "Unpublish" : "Publish Page"}
      </button>
    </form>
  );
}
