import { useParams } from 'react-router-dom';
import { BlogLayout } from '@/components/layout/BlogLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/useApi';
import { useSettings } from '@/hooks/useSettings';
import { SEO, BreadcrumbSchema } from '@/components/seo/SEO';

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

function PageSkeleton() {
  return (
    <article>
      {/* Title skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-2/3 mb-4" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </article>
  );
}

export function Page() {
  const { slug } = useParams<{ slug: string }>();
  const {
    data: page,
    isLoading,
  } = useApi<PageData>(`/pages/${slug}`);
  const { settings } = useSettings();
  const siteUrl = settings.siteUrl || window.location.origin;

  if (isLoading) {
    return (
      <BlogLayout>
        <PageSkeleton />
      </BlogLayout>
    );
  }

  if (!page) {
    return (
      <BlogLayout>
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold mb-4">Page not found</h1>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </div>
      </BlogLayout>
    );
  }

  const pageUrl = `${siteUrl}/page/${slug}`;
  const pageDescription = page.metaDescription || page.content?.replace(/<[^>]*>/g, '').substring(0, 160);

  return (
    <BlogLayout>
      <SEO
        title={page.metaTitle || page.title}
        description={pageDescription}
        url={pageUrl}
      >
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: siteUrl },
            { name: page.title, url: pageUrl },
          ]}
        />
      </SEO>

      <article>
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{page.title}</h1>
        </header>

        {page.content && (
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
      </article>
    </BlogLayout>
  );
}
