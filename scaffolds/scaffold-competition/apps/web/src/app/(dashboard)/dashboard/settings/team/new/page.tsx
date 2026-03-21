"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Building2, Loader2, AlertCircle } from "lucide-react";

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    // Only auto-generate if user hasn't manually edited slug
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      // Switch to the new tenant
      await fetch("/api/v1/tenants/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: data.tenant.id }),
      });

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" size="sm" className="mb-6" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create a New Team</CardTitle>
              <CardDescription>
                Create a new team to organize your projects and collaborate with
                others.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Team"
                required
              />
              <p className="text-sm text-muted-foreground">
                The display name for your team.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Team URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  app.example.com/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="my-team"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Only lowercase letters, numbers, and hyphens. This cannot be changed later.
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !name || !slug}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Team
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
