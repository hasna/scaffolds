"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Settings,
} from "lucide-react";

interface Section {
  id: string;
  type: string;
  order: number;
  content: Record<string, unknown>;
  enabled: boolean;
}

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  sections: Section[];
}

const SECTION_TYPES = [
  { value: "hero", label: "Hero Section", description: "Main headline and call-to-action" },
  { value: "features", label: "Features Grid", description: "Highlight key features" },
  { value: "cta", label: "Call to Action", description: "Conversion-focused section" },
  { value: "testimonials", label: "Testimonials", description: "Customer reviews and quotes" },
  { value: "faq", label: "FAQ", description: "Frequently asked questions" },
  { value: "pricing", label: "Pricing Table", description: "Plan comparison" },
  { value: "stats", label: "Stats/Numbers", description: "Key metrics and achievements" },
  { value: "team", label: "Team Grid", description: "Team member profiles" },
  { value: "logos", label: "Logo Cloud", description: "Partner or client logos" },
  { value: "content", label: "Rich Content", description: "Markdown/HTML content block" },
];

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    seoTitle: "",
    seoDescription: "",
    ogImage: "",
    status: "draft" as "draft" | "published" | "archived",
  });
  const [sectionContent, setSectionContent] = useState<Record<string, unknown>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  async function fetchPage() {
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}`);
      if (response.ok) {
        const data = await response.json();
        setPage(data.page);
        setFormData({
          title: data.page.title,
          slug: data.page.slug,
          seoTitle: data.page.seoTitle || "",
          seoDescription: data.page.seoDescription || "",
          ogImage: data.page.ogImage || "",
          status: data.page.status,
        });
      } else {
        router.push("/admin/marketing/pages");
      }
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          seoTitle: formData.seoTitle || null,
          seoDescription: formData.seoDescription || null,
          ogImage: formData.ogImage || null,
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

  async function handleAddSection(type: string) {
    try {
      const response = await fetch("/api/v1/cms/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          type,
          content: getDefaultContent(type),
        }),
      });

      if (response.ok) {
        setAddSectionOpen(false);
        fetchPage();
      }
    } catch (error) {
      console.error("Add section failed:", error);
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Delete this section?")) return;

    try {
      const response = await fetch(`/api/v1/cms/sections/${sectionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPage();
      }
    } catch (error) {
      console.error("Delete section failed:", error);
    }
  }

  async function handleToggleSection(sectionId: string, enabled: boolean) {
    try {
      await fetch(`/api/v1/cms/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      fetchPage();
    } catch (error) {
      console.error("Toggle section failed:", error);
    }
  }

  async function handleSaveSection(sectionId: string) {
    try {
      await fetch(`/api/v1/cms/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sectionContent }),
      });
      setEditSectionId(null);
      fetchPage();
    } catch (error) {
      console.error("Save section failed:", error);
    }
  }

  function handleDragStart(e: React.DragEvent, sectionId: string) {
    setDraggedId(sectionId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !page) return;

    const sections = [...page.sections];
    const draggedIndex = sections.findIndex((s) => s.id === draggedId);
    const targetIndex = sections.findIndex((s) => s.id === targetId);

    const [removed] = sections.splice(draggedIndex, 1);
    if (!removed) return;
    sections.splice(targetIndex, 0, removed);

    // Optimistic update
    setPage({ ...page, sections });

    // Save to server
    try {
      await fetch("/api/v1/cms/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          sectionIds: sections.map((s) => s.id),
        }),
      });
    } catch (error) {
      console.error("Reorder failed:", error);
      fetchPage(); // Revert on error
    }

    setDraggedId(null);
  }

  function getDefaultContent(type: string): Record<string, unknown> {
    switch (type) {
      case "hero":
        return { headline: "Welcome", subheadline: "", ctaText: "Get Started", ctaLink: "/" };
      case "features":
        return { title: "Features", items: [] };
      case "cta":
        return { title: "Ready to get started?", buttonText: "Sign Up", buttonLink: "/register" };
      case "testimonials":
        return { title: "What our customers say", items: [] };
      case "faq":
        return { title: "Frequently Asked Questions", items: [] };
      case "pricing":
        return { title: "Pricing", plans: [] };
      case "stats":
        return { items: [] };
      case "team":
        return { title: "Our Team", members: [] };
      case "logos":
        return { title: "Trusted by", logos: [] };
      case "content":
        return { content: "" };
      default:
        return {};
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/marketing/pages">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{page.title}</h1>
              <p className="text-sm text-muted-foreground">/{page.slug}</p>
            </div>
            <Badge variant={page.status === "published" ? "default" : "secondary"}>
              {page.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {page.status === "published" && (
              <Button variant="outline" asChild>
                <Link href={`/${page.slug}` as any} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
            )}
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
        {/* Page Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Page Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status as string}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as "draft" | "published" | "archived" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
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
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
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
                  placeholder="Brief description for search results..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogImage">Social Image URL</Label>
                <Input
                  id="ogImage"
                  value={formData.ogImage}
                  onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sections */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Page Sections</CardTitle>
              <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Section</DialogTitle>
                    <DialogDescription>
                      Choose a section type to add to your page.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3 py-4">
                    {SECTION_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleAddSection(type.value)}
                        className="flex flex-col items-start p-4 rounded-lg border hover:border-primary hover:bg-accent transition-colors text-left"
                      >
                        <span className="font-medium">{type.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {type.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {page.sections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No sections yet.</p>
                  <p className="text-sm">Add your first section to build your page.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {page.sections.map((section) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, section.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, section.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg border ${
                        draggedId === section.id ? "opacity-50" : ""
                      } ${!section.enabled ? "opacity-60 bg-muted" : "bg-card"}`}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{section.type}</span>
                          {!section.enabled && (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.enabled}
                          onCheckedChange={(checked) =>
                            handleToggleSection(section.id, checked)
                          }
                        />
                        <Dialog
                          open={editSectionId === section.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setSectionContent(section.content);
                              setEditSectionId(section.id);
                            } else {
                              setEditSectionId(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="capitalize">
                                Edit {section.type} Section
                              </DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <Label>Content (JSON)</Label>
                              <Textarea
                                value={JSON.stringify(sectionContent, null, 2)}
                                onChange={(e) => {
                                  try {
                                    setSectionContent(JSON.parse(e.target.value));
                                  } catch {
                                    // Invalid JSON, ignore
                                  }
                                }}
                                rows={15}
                                className="font-mono text-sm"
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setEditSectionId(null)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={() => handleSaveSection(section.id)}>
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
