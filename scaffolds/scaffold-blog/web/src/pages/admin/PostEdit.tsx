import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

export function PostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const { user } = useAuth();
  const canSelectAuthor = user?.role === 'admin';

  const { data: post } = useApi<any>(
    isNew ? '' : `/posts/id/${id}`,
    { skip: isNew }
  );

  const { data: users } = useApi<Array<{ id: string; name: string; email: string; role: string }>>(
    canSelectAuthor ? '/users' : '',
    { skip: !canSelectAuthor }
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [authorId, setAuthorId] = useState<string>('current');

  const { mutate, isLoading, error } = useApiMutation();

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setExcerpt(post.excerpt || '');
      setFeaturedImage(post.featuredImage || '');
      setStatus(post.status || 'draft');
      setAuthorId(post.authorId || 'current');
    }
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const postData = {
      title,
      content,
      excerpt,
      featuredImage,
      status,
      ...(canSelectAuthor && authorId !== 'current' ? { authorId } : {}),
    };

    const result = isNew
      ? await mutate('/posts', postData, 'POST')
      : await mutate(`/posts/${id}`, postData, 'PUT');

    if (result) {
      navigate('/admin/posts');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {isNew ? 'Create New Post' : 'Edit Post'}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? 'Write a new blog post' : 'Update your blog post'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Enter post title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short description of the post"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Write your post content here (Markdown supported)"
                  rows={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image URL</Label>
                <Input
                  id="featuredImage"
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {canSelectAuthor && (
                <div className="space-y-2">
                  <Label htmlFor="authorId">Author</Label>
                  <Select value={authorId} onValueChange={setAuthorId}>
                    <SelectTrigger id="authorId">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Use current user</SelectItem>
                      {(users || []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
              {error.message}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Saving...'
                : isNew
                ? 'Create Post'
                : 'Update Post'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/posts')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
