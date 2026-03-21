import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function Categories() {
  const { data: categories, refetch } = useApi<any[]>('/categories');
  const { mutate } = useApiMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteCategory = (categories || []).find((c) => c.id === deleteId) || null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    await mutate('/categories', {
      name,
      description,
    });

    setName('');
    setDescription('');
    refetch();
  };

  const handleDelete = async (id: string) => {
    await mutate(`/categories/${id}`, undefined, 'DELETE');
    refetch();
  };

  return (
    <AdminLayout>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete category?"
        description={deleteCategory ? `This will permanently delete “${deleteCategory.name}”.` : 'This will permanently delete the category.'}
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
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Organize your posts into categories
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Category</CardTitle>
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
                    placeholder="Category name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Category description"
                    rows={3}
                  />
                </div>

                <Button type="submit">Create Category</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {!categories || categories.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No categories yet. Create your first one!
                </p>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.slug}
                        </p>
                      </div>
                      <Button
                        onClick={() => setDeleteId(category.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Delete
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
