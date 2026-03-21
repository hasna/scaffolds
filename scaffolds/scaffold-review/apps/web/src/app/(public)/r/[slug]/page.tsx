import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { PublicResume, PrintableResume } from "@/components/resume/public-resume";
import { PublicResumeHeader } from "@/components/resume/public-resume-header";
import type { ResumeContent, ResumeTheme } from "@scaffold-review/types";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ print?: string }>;
}

async function getPublicResume(slug: string) {
  const resume = await db.query.resumes.findFirst({
    where: and(
      eq(schema.resumes.slug, slug),
      eq(schema.resumes.isPublic, true),
      isNull(schema.resumes.deletedAt)
    ),
    with: {
      user: {
        columns: {
          name: true,
        },
      },
    },
  });

  return resume;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resume = await getPublicResume(slug);

  if (!resume) {
    return {
      title: "Resume Not Found",
    };
  }

  const content = resume.content as ResumeContent;
  const name = content.personalInfo?.fullName || resume.title;

  return {
    title: `${name} - Resume`,
    description: content.summary || `Professional resume of ${name}`,
    openGraph: {
      title: `${name} - Resume`,
      description: content.summary || `Professional resume of ${name}`,
      type: "profile",
    },
  };
}

export default async function PublicResumePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { print } = await searchParams;

  const resume = await getPublicResume(slug);

  if (!resume) {
    notFound();
  }

  const content = resume.content as ResumeContent;
  const theme = resume.theme as ResumeTheme | undefined;
  const isPrintMode = print === "true";

  if (isPrintMode) {
    return <PrintableResume content={content} theme={theme} template={resume.template} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PublicResumeHeader
        title={resume.title}
        name={content.personalInfo?.fullName || "Resume"}
        resumeId={resume.id}
      />

      {/* Resume Content */}
      <main className="py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <PublicResume content={content} theme={theme} template={resume.template} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-muted-foreground no-print py-6 text-center text-sm">
        <p>
          Created with{" "}
          <Link href="/" className="text-primary hover:underline">
            123Resume.co
          </Link>
        </p>
      </footer>
    </div>
  );
}
