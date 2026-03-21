"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(3),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().min(20),
  rules: z.string().min(10),
  prizes: z.string().min(5),
  status: z.enum(["draft", "open", "judging", "closed"]),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  submissionDeadline: z.string().min(1, "Required"),
  maxTeamSize: z.coerce.number().int().min(1).max(20),
  bannerImage: z.string().url().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function NewCompetitionPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "draft",
      maxTeamSize: 4,
    },
  });

  const title = watch("title");

  function autoSlug() {
    if (!title) return;
    setValue(
      "slug",
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 60)
    );
  }

  async function onSubmit(data: FormValues) {
    try {
      const res = await fetch("/api/v1/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed");
      toast.success("Competition created!");
      router.push("/admin/competitions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/admin/competitions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to competitions
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">New Competition</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register("title")}
                  onBlur={autoSlug}
                  placeholder="Spring Hackathon 2026"
                />
                {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" {...register("slug")} placeholder="spring-hackathon-2026" />
                {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...register("description")}
                rows={4}
                placeholder="What is this competition about?"
              />
              {errors.description && (
                <p className="text-destructive text-xs">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  defaultValue="draft"
                  onValueChange={(v) => setValue("status", v as FormValues["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="judging">Judging</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTeamSize">Max Team Size *</Label>
                <Input
                  id="maxTeamSize"
                  type="number"
                  min={1}
                  max={20}
                  {...register("maxTeamSize")}
                />
                {errors.maxTeamSize && (
                  <p className="text-destructive text-xs">{errors.maxTeamSize.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bannerImage">Banner Image URL (optional)</Label>
              <Input
                id="bannerImage"
                type="url"
                {...register("bannerImage")}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="datetime-local" {...register("startDate")} />
                {errors.startDate && (
                  <p className="text-destructive text-xs">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="submissionDeadline">Submission Deadline *</Label>
                <Input
                  id="submissionDeadline"
                  type="datetime-local"
                  {...register("submissionDeadline")}
                />
                {errors.submissionDeadline && (
                  <p className="text-destructive text-xs">{errors.submissionDeadline.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" type="datetime-local" {...register("endDate")} />
                {errors.endDate && (
                  <p className="text-destructive text-xs">{errors.endDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules &amp; Prizes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rules">Rules *</Label>
              <Textarea id="rules" {...register("rules")} rows={5} placeholder="List the rules..." />
              {errors.rules && <p className="text-destructive text-xs">{errors.rules.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prizes">Prizes *</Label>
              <Textarea
                id="prizes"
                {...register("prizes")}
                rows={3}
                placeholder="1st place: $1000, 2nd place: $500..."
              />
              {errors.prizes && <p className="text-destructive text-xs">{errors.prizes.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Competition"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/competitions">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
