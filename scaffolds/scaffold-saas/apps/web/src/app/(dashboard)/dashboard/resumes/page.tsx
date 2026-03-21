"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { ResumeList } from "@/components/resume/resume-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResumeContent } from "@scaffold-saas/types";

interface ResumeApiResponse {
  id: string;
  title: string;
  slug?: string | null;
  isPublic: boolean;
  isMaster: boolean;
  targetJobTitle?: string | null;
  template: string;
  content: ResumeContent;
  createdAt: string;
  updatedAt: string;
}

interface Resume {
  id: string;
  title: string;
  slug?: string | null;
  isPublic: boolean;
  isMaster: boolean;
  targetJobTitle?: string | null;
  template: string;
  content: ResumeContent;
  createdAt: Date;
  updatedAt: Date;
}

export default function ResumesPage() {
  const { status } = useSession();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const triggerRefresh = useCallback(() => {
    setFetchCount((c) => c + 1);
  }, []);

  useEffect(() => {
    // Only fetch when session is authenticated
    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();

    async function fetchResumes() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/v1/resumes", {
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Session not ready yet, don't treat as error
            return;
          }
          throw new Error("Failed to fetch resumes");
        }

        const data: { data: ResumeApiResponse[] } = await res.json();
        setResumes(
          data.data.map((r) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          }))
        );
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchResumes();

    return () => {
      controller.abort();
    };
  }, [status, fetchCount]);

  const handleDelete = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDuplicate = () => {
    // Refresh list after duplicate
    triggerRefresh();
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Resumes"
        description="Manage your resumes and create new ones with AI assistance"
      />

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={triggerRefresh} className="text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <ResumeList resumes={resumes} onDelete={handleDelete} onDuplicate={handleDuplicate} />
        </div>
      )}
    </div>
  );
}
