"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Sparkles,
  Wrench,
  Bug,
  AlertTriangle,
} from "lucide-react";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  type: "feature" | "improvement" | "fix" | "breaking" | null;
  publishedAt: string | null;
  createdAt: string;
}

const ENTRY_TYPES = [
  { value: "feature", label: "Feature", icon: Sparkles, color: "bg-blue-500" },
  { value: "improvement", label: "Improvement", icon: Wrench, color: "bg-green-500" },
  { value: "fix", label: "Bug Fix", icon: Bug, color: "bg-yellow-500" },
  { value: "breaking", label: "Breaking", icon: AlertTriangle, color: "bg-red-500" },
];

export default function AdminChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ChangelogEntry | null>(null);
  const [formData, setFormData] = useState({
    version: "",
    title: "",
    content: "",
    type: "" as string,
    isPublished: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const response = await fetch("/api/v1/cms/changelog");
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditEntry(null);
    setFormData({ version: "", title: "", content: "", type: "", isPublished: false });
    setDialogOpen(true);
  }

  function openEdit(entry: ChangelogEntry) {
    setEditEntry(entry);
    setFormData({
      version: entry.version,
      title: entry.title,
      content: entry.content,
      type: entry.type || "",
      isPublished: !!entry.publishedAt,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        version: formData.version,
        title: formData.title,
        content: formData.content,
        type: formData.type || undefined,
        publishedAt: formData.isPublished ? new Date().toISOString() : undefined,
      };

      if (editEntry) {
        // Update
        const response = await fetch(`/api/v1/cms/changelog/${editEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.error || "Failed to update");
          return;
        }
      } else {
        // Create
        const response = await fetch("/api/v1/cms/changelog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.error || "Failed to create");
          return;
        }
      }

      setDialogOpen(false);
      fetchEntries();
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`/api/v1/cms/changelog/${entryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.version.toLowerCase().includes(search.toLowerCase())
  );

  function getTypeInfo(type: string | null) {
    return ENTRY_TYPES.find((t) => t.value === type);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Changelog</h1>
          <p className="text-muted-foreground">
            Manage your product changelog entries.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editEntry ? "Edit Entry" : "Create Entry"}
                </DialogTitle>
                <DialogDescription>
                  {editEntry
                    ? "Update the changelog entry."
                    : "Add a new changelog entry."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) =>
                        setFormData({ ...formData, version: e.target.value })
                      }
                      placeholder="v1.2.0"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTRY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="What's new in this release"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={10}
                    className="font-mono text-sm"
                    placeholder="Describe the changes..."
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="published"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPublished: checked })
                    }
                  />
                  <Label htmlFor="published">Publish immediately</Label>
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
                  {editEntry ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search changelog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => {
                const typeInfo = getTypeInfo(entry.type);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {entry.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.title}</div>
                    </TableCell>
                    <TableCell>
                      {typeInfo ? (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 w-fit"
                        >
                          <typeInfo.icon className="h-3 w-3" />
                          {typeInfo.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.publishedAt ? "default" : "secondary"}
                      >
                        {entry.publishedAt ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.publishedAt
                        ? new Date(entry.publishedAt).toLocaleDateString()
                        : new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No changelog entries yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
