"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const teamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

type TeamValues = z.infer<typeof teamSchema>;

interface TeamSettingsProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  userRole?: "member" | "manager" | "owner";
}

export function TeamSettings({ tenant, userRole }: TeamSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const canEdit = userRole === "owner" || userRole === "manager";

  const form = useForm<TeamValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: tenant?.name ?? "",
      slug: tenant?.slug ?? "",
    },
  });

  async function onSubmit(values: TeamValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/team/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to update team settings");
      }

      toast.success("Team settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  }

  if (!tenant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No team found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Settings</CardTitle>
        <CardDescription>Manage your team&apos;s name and URL</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
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
                      <Input {...field} disabled={!canEdit} className="max-w-[200px]" />
                    </div>
                  </FormControl>
                  <FormDescription>
                    This is your team&apos;s unique identifier.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canEdit && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
