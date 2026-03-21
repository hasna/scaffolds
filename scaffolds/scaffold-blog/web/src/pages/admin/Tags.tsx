import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function Tags() {
  const { data: tags, refetch } = useApi<any[]>('/tags');
  const { mutate } = useApiMutation();

  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteTag = (tags || []).find((t) => t.id === deleteId) || null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    await mutate('/tags', { name });

    setName('');
    refetch();
  };

  const handleDelete = async (id: string) => {
    await mutate(`/tags/${id}`, undefined, 'DELETE');
    refetch();
  };

  return (
    <AdminLayout>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete tag?"
        description={deleteTag ? `This will permanently delete “${deleteTag.name}”.` : 'This will permanently delete the tag.'}
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteId) return
          await handleDelete(deleteId)
          setDeleteId(null)
        }}
        confirmVariant="destructive"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
          <p className="text-muted-foreground">
            Add tags to help organize and filter posts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Tag</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Tag name"
                  />
                </div>

                <Button type="submit">Create Tag</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {!tags || tags.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No tags yet. Create your first one!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 px-3 py-2 border rounded-full"
                    >
                      <span className="text-sm">{tag.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 min-h-0 min-w-0 rounded-full text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(tag.id)}
                        aria-label={`Delete tag ${tag.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
