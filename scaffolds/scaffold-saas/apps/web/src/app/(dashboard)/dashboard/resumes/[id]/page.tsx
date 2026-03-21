"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconSparkles,
  IconEye,
  IconDownload,
  IconShare,
  IconDots,
  IconSettings,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeChat } from "@/components/resume/resume-chat";
import { ResumeEditor } from "@/components/resume/resume-editor";
import { PublicResume } from "@/components/resume/public-resume";
import { ExportDialog } from "@/components/resume/export-dialog";
import type { TemplateStyle } from "@/components/resume/template-picker";
import type { ResumeContent, ResumeTheme } from "@scaffold-saas/types";

interface Resume {
  id: string;
  title: string;
  slug?: string | null;
  isPublic: boolean;
  isMaster: boolean;
  targetJobTitle?: string | null;
  template: string;
  theme?: ResumeTheme | null;
  content: ResumeContent;
  createdAt: string;
  updatedAt: string;
}

export default function ResumeEditorPage() {
  const params = useParams();
  const resumeId = params.id as string;

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "editor" | "preview">("chat");

  const fetchResume = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/resumes/${resumeId}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Resume not found");
        }
        throw new Error("Failed to fetch resume");
      }

      const data = (await res.json()) as { data: Resume };
      setResume(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    void fetchResume();
  }, [fetchResume]);

  const handleUpdate = useCallback(
    async (updates: { content?: ResumeContent; template?: TemplateStyle }) => {
      if (!resume) return;

      try {
        const res = await fetch(`/api/v1/resumes/${resumeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          throw new Error("Failed to update resume");
        }

        const data = (await res.json()) as { data: Resume };
        setResume(data.data);
      } catch (err) {
        console.error("Update failed:", err);
      }
    },
    [resume, resumeId]
  );

  const handleResumeUpdated = useCallback(() => {
    void fetchResume();
  }, [fetchResume]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-[600px] rounded-lg" />
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="container max-w-7xl py-6">
        <div className="py-12 text-center">
          <p className="text-destructive mb-4">{error ?? "Resume not found"}</p>
          <Link href="/dashboard/resumes">
            <Button>Back to Resumes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/resumes">
            <Button variant="ghost" size="icon">
              <IconArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{resume.title}</h1>
            <p className="text-muted-foreground text-sm">
              {resume.targetJobTitle
                ? `Targeting: ${resume.targetJobTitle}`
                : resume.isMaster
                  ? "Master Resume"
                  : "Resume Variant"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resume.isPublic && resume.slug && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/r/${resume.slug}`} target="_blank" rel="noopener noreferrer">
                <IconEye className="mr-2 h-4 w-4" />
                View Public
              </a>
            </Button>
          )}

          <ExportDialog
            resumeId={resumeId}
            currentTemplate={resume.template}
            trigger={
              <Button variant="outline" size="sm">
                <IconDownload className="mr-2 h-4 w-4" />
                Export
              </Button>
            }
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <IconDots className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <IconShare className="mr-2 h-4 w-4" />
                Share Resume
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconSettings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete Resume</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "chat" | "editor" | "preview")}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="chat" className="gap-2">
            <IconSparkles className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-0">
          <div className="grid h-[calc(100vh-280px)] grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Chat Panel */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconSparkles className="text-primary h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <CardDescription>Ask me to help improve your resume</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ResumeChat
                  resumeId={resumeId}
                  onResumeUpdated={handleResumeUpdated}
                  className="h-full"
                />
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto bg-gray-50 p-4">
                <div className="min-h-full rounded bg-white p-6 shadow-sm">
                  <PublicResume
                    content={resume.content}
                    theme={resume.theme ?? undefined}
                    template={resume.template}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Editor Panel */}
            <div className="space-y-4">
              <ResumeEditor
                resumeId={resumeId}
                content={resume.content}
                template={resume.template as TemplateStyle}
                onUpdate={handleUpdate}
              />
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-180px)]">
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)] overflow-auto bg-gray-50 p-4">
                  <div className="rounded bg-white p-6 shadow-sm">
                    <PublicResume
                      content={resume.content}
                      theme={resume.theme ?? undefined}
                      template={resume.template}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-100 p-8">
                <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-lg">
                  <PublicResume
                    content={resume.content}
                    theme={resume.theme ?? undefined}
                    template={resume.template}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
