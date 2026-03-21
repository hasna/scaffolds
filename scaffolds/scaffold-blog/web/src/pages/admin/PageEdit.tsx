import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  showInNav: boolean;
  navOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
}

export function PageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: page } = useApi<Page>(
    isNew ? '' : `/pages/id/${id}`,
    { skip: isNew }
  );

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [showInNav, setShowInNav] = useState(false);
  const [navOrder, setNavOrder] = useState(0);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const { mutate, isLoading, error } = useApiMutation();

  useEffect(() => {
    if (page) {
      setTitle(page.title || '');
      setSlug(page.slug || '');
      setContent(page.content || '');
      setStatus(page.status || 'draft');
      setShowInNav(page.showInNav || false);
      setNavOrder(page.navOrder || 0);
      setMetaTitle(page.metaTitle || '');
      setMetaDescription(page.metaDescription || '');
    }
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pageData = {
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      content,
      status,
      showInNav,
      navOrder,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
    };

    const result = isNew
      ? await mutate('/pages', pageData, 'POST')
      : await mutate(`/pages/${id}`, pageData, 'PUT');

    if (result) {
      navigate('/admin/pages');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {isNew ? 'Create New Page' : 'Edit Page'}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? 'Create a new static page' : 'Update your static page'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Enter page title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="page-url-slug (auto-generated if empty)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your page content here (supports HTML)"
                  rows={15}
                />
              </div>

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

          <Card>
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showInNav"
                  checked={showInNav}
                  onCheckedChange={(v) => setShowInNav(Boolean(v))}
                />
                <Label htmlFor="showInNav">Show in navigation</Label>
              </div>

              {showInNav && (
                <div className="space-y-2">
                  <Label htmlFor="navOrder">Navigation Order</Label>
                  <Input
                    id="navOrder"
                    type="number"
                    value={navOrder}
                    onChange={(e) => setNavOrder(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Lower numbers appear first in navigation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO title (uses page title if empty)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO description"
                  rows={3}
                />
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
                ? 'Create Page'
                : 'Update Page'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/pages')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
