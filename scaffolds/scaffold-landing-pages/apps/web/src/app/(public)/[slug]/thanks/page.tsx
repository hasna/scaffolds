import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Thanks for signing up!",
};

export default async function ThanksPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 text-center">
      <div className="rounded-2xl bg-white p-12 shadow-sm">
        <div className="mb-6 text-6xl">🎉</div>
        <h1 className="mb-4 text-3xl font-bold text-slate-900">Thanks for signing up!</h1>
        <p className="mb-8 text-lg text-slate-600">
          We&apos;ll be in touch soon. Stay tuned for updates!
        </p>
        <Link
          href={`/${slug}`}
          className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
        >
          Back to page
        </Link>
      </div>
    </div>
  );
}
