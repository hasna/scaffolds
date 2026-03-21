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
import { formatDate } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface PaginatedPosts {
  data: Array<{
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
    publishedAt: string | null;
    createdAt: string;
    author?: { name: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function Posts() {
  const { data: postsPage, refetch } = useApi<PaginatedPosts>('/posts?includeUnpublished=1&page=1&pageSize=100');
  const { mutate } = useApiMutation();

  const posts = postsPage?.data || [];

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deletePost = useMemo(() => posts.find((p) => p.id === deleteId) || null, [deleteId, posts])
  const deleteOpen = Boolean(deleteId)

  const handleDelete = async () => {
    if (!deleteId) return
    const ok = await mutate(`/posts/${deleteId}`, undefined, 'DELETE');
    setDeleteId(null)
    if (ok) refetch();
  }

  return (
    <AdminLayout>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete post?"
        description={deletePost ? `This will permanently delete “${deletePost.title}”.` : 'This will permanently delete the post.'}
        confirmText="Delete"
        onConfirm={handleDelete}
        confirmVariant="destructive"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Posts</h1>
            <p className="text-muted-foreground">Manage your blog posts</p>
          </div>
          <Button asChild>
            <Link to="/admin/posts/new">Create New Post</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {!posts || posts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No posts yet. Create your first post!
              </p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{post.title}</h3>
                        <Badge
                          variant={
                            post.status === 'published'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {post.publishedAt
                          ? `Published ${formatDate(post.publishedAt)}`
                          : 'Draft'}
                        {' • '}By {post.author?.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/posts/${post.id}/edit`}>Edit</Link>
                      </Button>
                      <Button
                        onClick={() => setDeleteId(post.id)}
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
