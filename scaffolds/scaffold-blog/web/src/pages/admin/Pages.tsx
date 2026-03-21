import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  showInNav: boolean;
  navOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function Pages() {
  const { data: pages, refetch } = useApi<Page[]>('/pages');
  const { mutate } = useApiMutation();

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deletePage = useMemo(() => (pages || []).find((p) => p.id === deleteId) || null, [deleteId, pages])

  const handleDelete = async () => {
    if (!deleteId) return
    const ok = await mutate(`/pages/${deleteId}`, undefined, 'DELETE');
    setDeleteId(null)
    if (ok) refetch();
  }

  return (
    <AdminLayout>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete page?"
        description={deletePage ? `This will permanently delete “${deletePage.title}”.` : 'This will permanently delete the page.'}
        confirmText="Delete"
        onConfirm={handleDelete}
        confirmVariant="destructive"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Pages</h1>
            <p className="text-muted-foreground">Manage your static pages</p>
          </div>
          <Button asChild>
            <Link to="/admin/pages/new">Create New Page</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {!pages || pages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No pages yet. Create your first page!
              </p>
            ) : (
              <div className="space-y-4">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{page.title}</h3>
                        <Badge
                          variant={
                            page.status === 'published'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {page.status}
                        </Badge>
                        {page.showInNav && (
                          <Badge variant="outline">
                            Nav #{page.navOrder}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        /{page.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/pages/${page.id}/edit`}>Edit</Link>
                      </Button>
                      <Button
                        onClick={() => setDeleteId(page.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
