"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      slug: (form.elements.namedItem("slug") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/v1/lander/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create page");
      }

      const page = (await res.json()) as { id: string };
      router.push(`/dashboard/pages/${page.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Create New Page</h1>
        <p className="mt-1 text-slate-600">Set up your new landing page.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="title">
            Page Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="My Awesome Product"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
            onChange={(e) => {
              const slugInput = document.getElementById("slug") as HTMLInputElement;
              if (slugInput && !slugInput.dataset.edited) {
                slugInput.value = slugify(e.target.value);
              }
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="slug">
            URL Slug
          </label>
          <div className="flex items-center rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-slate-500">
            <span className="border-r border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              /
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              pattern="[a-z0-9-]+"
              placeholder="my-awesome-product"
              className="flex-1 px-4 py-2.5 focus:outline-none"
              onChange={(e) => {
                (e.target as HTMLInputElement).dataset.edited = "true";
                e.target.value = slugify(e.target.value);
              }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">Lowercase letters, numbers, and hyphens only.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="A brief description of your page..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Page"}
          </button>
        </div>
      </form>
    </div>
  );
}
