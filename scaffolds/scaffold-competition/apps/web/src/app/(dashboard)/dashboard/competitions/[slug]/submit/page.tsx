"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Globe, Github, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";

const submissionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  projectUrl: z.string().url("Must be a valid URL"),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  repoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

export default function SubmitPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
  });

  async function onSubmit(data: SubmissionForm, asDraft = false) {
    const setter = asDraft ? setIsSavingDraft : setIsSubmitting;
    setter(true);
    try {
      const res = await fetch("/api/v1/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, competitionSlug: slug, draft: asDraft }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save");
      toast.success(asDraft ? "Draft saved!" : "Submission submitted successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setter(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
          <FileText className="h-4 w-4" />
          <span>Competition: {slug}</span>
        </div>
        <h1 className="text-2xl font-bold">Project Submission</h1>
        <p className="text-muted-foreground mt-1">
          Submit your team&apos;s project. You can save as draft and come back anytime before
          the deadline.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Tell us about what you built.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input id="title" placeholder="My Awesome Project" {...register("title")} />
              {errors.title && (
                <p className="text-destructive text-xs">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your project — what problem does it solve, how does it work, what tech did you use..."
                rows={6}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-destructive text-xs">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>At least a project URL is required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project URL */}
            <div className="space-y-2">
              <Label htmlFor="projectUrl" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Project URL *
              </Label>
              <Input
                id="projectUrl"
                type="url"
                placeholder="https://myproject.com"
                {...register("projectUrl")}
              />
              {errors.projectUrl && (
                <p className="text-destructive text-xs">{errors.projectUrl.message}</p>
              )}
            </div>

            {/* Demo URL */}
            <div className="space-y-2">
              <Label htmlFor="demoUrl" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Demo URL <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="demoUrl"
                type="url"
                placeholder="https://demo.myproject.com"
                {...register("demoUrl")}
              />
              {errors.demoUrl && (
                <p className="text-destructive text-xs">{errors.demoUrl.message}</p>
              )}
            </div>

            {/* Repo URL */}
            <div className="space-y-2">
              <Label htmlFor="repoUrl" className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                Repository URL <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="repoUrl"
                type="url"
                placeholder="https://github.com/team/project"
                {...register("repoUrl")}
              />
              {errors.repoUrl && (
                <p className="text-destructive text-xs">{errors.repoUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSavingDraft}
            onClick={handleSubmit((d) => onSubmit(d, true))}
          >
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
