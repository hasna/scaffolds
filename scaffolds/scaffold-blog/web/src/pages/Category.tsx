import { useParams } from 'react-router-dom';
import { BlogLayout } from '@/components/layout/BlogLayout';
import { PostList } from '@/components/blog/PostList';
import { useApi } from '@/hooks/useApi';
import { useSettings } from '@/hooks/useSettings';
import { SEO, CollectionPageSchema, BreadcrumbSchema } from '@/components/seo/SEO';
import { useEffect, useMemo, useState } from 'react';
import type { PostSummary } from '@/types/post';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function ListingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[64/5] w-full rounded-lg" />
            <Skeleton className="h-7 w-4/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

interface PaginatedPosts {
  data: PostSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { data: category, isLoading } = useApi<CategoryData>(`/categories/${slug}`);
  const { settings } = useSettings();
  const siteUrl = settings.siteUrl || window.location.origin;

  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<PostSummary[]>([]);

  const postsEndpoint = useMemo(() => {
    if (!category?.id) return '';
    const params = new URLSearchParams({
      categoryId: category.id,
      page: String(page),
      pageSize: '10',
    });
    return `/posts?${params.toString()}`;
  }, [category?.id, page]);

  const { data: postsData, isLoading: postsLoading } = useApi<PaginatedPosts>(postsEndpoint, {
    skip: !category?.id,
  });

  useEffect(() => {
    setPage(1);
    setPosts([]);
  }, [slug]);

  useEffect(() => {
    if (!postsData) return;
    setPosts((prev) => {
      if (page === 1) return postsData.data || [];
      const existing = new Set(prev.map((p) => p.id));
      const next = (postsData.data || []).filter((p) => !existing.has(p.id));
      return [...prev, ...next];
    });
  }, [postsData, page]);

  if (isLoading) {
    return (
      <BlogLayout>
        <ListingSkeleton />
      </BlogLayout>
    );
  }

  if (!category) {
    return (
      <BlogLayout>
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold mb-4">Category not found</h1>
          <p className="text-muted-foreground">
            The category you're looking for doesn't exist.
          </p>
        </div>
      </BlogLayout>
    );
  }

  const categoryUrl = `${siteUrl}/category/${slug}`;
  const canLoadMore = Boolean(postsData && page < postsData.totalPages);
  const isLoadingMore = postsLoading && page > 1;

  return (
    <BlogLayout>
      <SEO
        title={`Category: ${category.name}`}
        description={category.description || `Browse posts in the ${category.name} category`}
        url={categoryUrl}
      >
        <CollectionPageSchema
          name={`Category: ${category.name}`}
          description={category.description || `Browse posts in the ${category.name} category`}
          url={categoryUrl}
        />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: siteUrl },
            { name: category.name, url: categoryUrl },
          ]}
        />
      </SEO>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Category: {category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground">{category.description}</p>
        )}
      </div>

      {postsLoading && page === 1 ? (
        <ListingSkeleton />
      ) : (
        <PostList posts={posts} />
      )}

      <div className="mt-10 flex justify-center">
        {canLoadMore && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </div>
    </BlogLayout>
  );
}
