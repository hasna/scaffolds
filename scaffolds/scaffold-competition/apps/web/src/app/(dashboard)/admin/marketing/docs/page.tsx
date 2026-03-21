"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  FileText,
  ChevronRight,
  ChevronDown,
  FolderOpen,
} from "lucide-react";

interface DocNode {
  id: string;
  slug: string;
  title: string;
  order: number;
  children: DocNode[];
}

interface DocFlat {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
}

export default function AdminDocsPage() {
  const [tree, setTree] = useState<DocNode[]>([]);
  const [flatDocs, setFlatDocs] = useState<DocFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    content: "",
    parentId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    try {
      const [treeRes, docsRes] = await Promise.all([
        fetch("/api/v1/cms/docs/tree"),
        fetch("/api/v1/cms/docs"),
      ]);

      if (treeRes.ok) {
        const data = await treeRes.json();
        setTree(data.tree);
        // Expand all by default
        const allIds = new Set<string>();
        function collectIds(nodes: DocNode[]) {
          for (const node of nodes) {
            allIds.add(node.id);
            collectIds(node.children);
          }
        }
        collectIds(data.tree);
        setExpanded(allIds);
      }

      if (docsRes.ok) {
        const data = await docsRes.json();
        setFlatDocs(
          data.docs.map((d: { id: string; slug: string; title: string; parentId: string | null }) => ({
            id: d.id,
            slug: d.slug,
            title: d.title,
            parentId: d.parentId,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch docs:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  }

  function openCreate(parentId?: string) {
    setFormData({ slug: "", title: "", content: "", parentId: parentId || "" });
    setDialogOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/v1/cms/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchDocs();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create");
      }
    } catch (error) {
      console.error("Create failed:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Are you sure you want to delete this doc?")) return;

    try {
      const response = await fetch(`/api/v1/cms/docs/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDocs();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  function renderTree(nodes: DocNode[], depth = 0) {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.id);

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted group ${
              depth > 0 ? "ml-6" : ""
            }`}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="p-1 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Link
              href={`/admin/marketing/docs/${node.id}`}
              className="flex-1 font-medium hover:underline"
            >
              {node.title}
            </Link>
            <span className="text-sm text-muted-foreground hidden group-hover:block">
              /{node.slug}
            </span>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openCreate(node.id)}
                title="Add child"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <Link href={`/admin/marketing/docs/${node.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(node.id)}
                disabled={hasChildren}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          {hasChildren && isExpanded && (
            <div className="border-l ml-6">{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">
            Manage your documentation pages.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Doc Page</DialogTitle>
                <DialogDescription>
                  Add a new documentation page.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
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
                    required
                  />
                </div>
                <div className="grid gap-2">
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
                      {flatDocs.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={8}
                    className="font-mono text-sm"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No documentation pages yet.</p>
          <Button className="mt-4" onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first page
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg p-4">{renderTree(tree)}</div>
      )}
    </div>
  );
}
