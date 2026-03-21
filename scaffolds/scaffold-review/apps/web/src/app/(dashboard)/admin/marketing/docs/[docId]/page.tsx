"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Loader2, Settings } from "lucide-react";

interface DocPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  parentId: string | null;
  order: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

interface DocFlat {
  id: string;
  slug: string;
  title: string;
}

export default function DocEditorPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<DocPage | null>(null);
  const [allDocs, setAllDocs] = useState<DocFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    parentId: "",
    order: 0,
    seoTitle: "",
    seoDescription: "",
  });

  useEffect(() => {
    fetchDoc();
    fetchAllDocs();
  }, [docId]);

  async function fetchDoc() {
    try {
      const response = await fetch(`/api/v1/cms/docs/${docId}`);
      if (response.ok) {
        const data = await response.json();
        setDoc(data.doc);
        setFormData({
          title: data.doc.title,
          slug: data.doc.slug,
          content: data.doc.content,
          parentId: data.doc.parentId || "",
          order: data.doc.order,
          seoTitle: data.doc.seoTitle || "",
          seoDescription: data.doc.seoDescription || "",
        });
      } else {
        router.push("/admin/marketing/docs");
      }
    } catch (error) {
      console.error("Failed to fetch doc:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllDocs() {
    try {
      const response = await fetch("/api/v1/cms/docs");
      if (response.ok) {
        const data = await response.json();
        setAllDocs(
          data.docs
            .filter((d: DocFlat) => d.id !== docId)
            .map((d: DocFlat) => ({ id: d.id, slug: d.slug, title: d.title }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch docs:", error);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/cms/docs/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
          seoTitle: formData.seoTitle || null,
          seoDescription: formData.seoDescription || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/marketing/docs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{doc.title}</h1>
              <p className="text-sm text-muted-foreground">/docs/{doc.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/docs/${doc.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={25}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Page Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Page</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No parent (root level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (root level)</SelectItem>
                    {allDocs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  min={0}
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, seoTitle: e.target.value })
                  }
                  placeholder="Page title for search engines"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, seoDescription: e.target.value })
                  }
                  rows={3}
                  placeholder="Brief description for search results..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
