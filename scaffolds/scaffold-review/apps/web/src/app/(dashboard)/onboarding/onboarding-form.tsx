"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";

const onboardingSchema = z.object({
  teamName: z.string().min(2, "Team name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
  userId: string;
}

export function OnboardingForm({ userId: _userId }: OnboardingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      teamName: "",
      slug: "",
    },
  });

  // Auto-generate slug from team name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  async function onSubmit(values: OnboardingValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create team");
      }

      toast.success("Team created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create team");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="teamName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    // Auto-fill slug if it's empty or matches generated pattern
                    const currentSlug = form.getValues("slug");
                    const expectedSlug = generateSlug(field.value);
                    if (!currentSlug || currentSlug === expectedSlug) {
                      form.setValue("slug", generateSlug(e.target.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team URL</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground mr-2">app.example.com/</span>
                  <Input placeholder="acme-inc" {...field} className="max-w-[200px]" />
                </div>
              </FormControl>
              <FormDescription>
                This will be your team&apos;s unique identifier
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Team
        </Button>
      </form>
    </Form>
  );
}
