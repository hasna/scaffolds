"use client";

import { useState, useCallback } from "react";
import { IconArrowLeft, IconFileText, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeChat } from "@/components/resume/resume-chat";
import { TemplateSelect, type TemplateStyle } from "@/components/resume/template-picker";
import Link from "next/link";

export default function NewResumePage() {
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [title, setTitle] = useState("My Resume");
  const [template, setTemplate] = useState<TemplateStyle>("modern");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<"setup" | "chat">("setup");

  const createResume = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/v1/resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          template,
          isMaster: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create resume");
      }

      const data = await res.json();
      setResumeId(data.data.id);
      setStep("chat");
    } catch (error) {
      console.error("Failed to create resume:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResumeUpdated = useCallback(() => {
    // Could refresh resume preview here
  }, []);

  return (
    <div className="container max-w-6xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/resumes">
          <Button variant="ghost" size="icon">
            <IconArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Resume</h1>
          <p className="text-muted-foreground">
            {step === "setup" ? "Set up your resume basics" : "Chat with AI to build your resume"}
          </p>
        </div>
      </div>

      {step === "setup" ? (
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Resume Details</CardTitle>
              <CardDescription>
                Give your resume a name and choose a template to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Resume Name</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Software Engineer Resume"
                />
              </div>

              <div className="space-y-2">
                <Label>Template Style</Label>
                <TemplateSelect value={template} onChange={setTemplate} />
              </div>

              <Button
                onClick={createResume}
                disabled={!title.trim() || isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  "Creating..."
                ) : (
                  <>
                    <IconSparkles className="mr-2 h-4 w-4" />
                    Start Building with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Start Options */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">Or start from...</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="hover:border-primary cursor-pointer transition-colors">
                <CardContent className="flex items-start gap-3 pt-4">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <IconFileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Import from LinkedIn</h3>
                    <p className="text-muted-foreground text-sm">
                      Paste your LinkedIn URL to auto-fill
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-primary cursor-pointer transition-colors">
                <CardContent className="flex items-start gap-3 pt-4">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <IconFileText className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Upload Existing Resume</h3>
                    <p className="text-muted-foreground text-sm">
                      Import from PDF or Word document
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-[calc(100vh-200px)] grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chat Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconSparkles className="text-primary h-5 w-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Tell me about yourself and I'll help build your resume
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {resumeId && (
                <ResumeChat
                  resumeId={resumeId}
                  onResumeUpdated={handleResumeUpdated}
                  className="h-full"
                />
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>Live preview of your resume</CardDescription>
                </div>
                {resumeId && (
                  <Link href={`/dashboard/resumes/${resumeId}`}>
                    <Button variant="outline" size="sm">
                      Open Editor
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="bg-muted/50 flex-1 overflow-auto rounded-b-lg">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="text-muted-foreground text-center">
                  <IconFileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Your resume preview will appear here</p>
                  <p className="text-sm">Start chatting to add content</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
