import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom';
import { BlogLayout } from '@/components/layout/BlogLayout';
import { PostContent } from '@/components/blog/PostContent';
import { CommentSection } from '@/components/blog/CommentSection';
import { CommentForm } from '@/components/blog/CommentForm';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { useSettings } from '@/hooks/useSettings';
import { SEO, BlogPostingSchema, BreadcrumbSchema } from '@/components/seo/SEO';
import type { PostSummary } from '@/types/post';
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

function PostSkeleton() {
  return (
    <article>
      {/* Featured image skeleton */}
      <Skeleton className="aspect-[32/5] w-full rounded-lg mb-8" />

      {/* Title skeleton */}
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-10 w-3/4 mb-4" />

      {/* Date skeleton */}
      <Skeleton className="h-4 w-32 mb-8" />

      {/* Content skeleton - paragraphs */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </article>
  );
}

interface ApiComment {
  id: string
  postId: string
  parentId: string | null
  authorName: string
  authorEmail: string
  content: string
  status: 'approved' | 'pending' | 'spam' | 'deleted'
  createdAt: string
  replies?: ApiComment[]
}

interface LikeStatus {
  likesCount: number
  liked: boolean
}

export function Post() {
  const { slug } = useParams<{ slug: string }>();
  const {
    data: post,
    isLoading,
    refetch,
  } = useApi<PostSummary>(`/posts/${slug}`);
  const { settings } = useSettings();

  const [likeKey, setLikeKey] = useState<string | null>(null)

  useEffect(() => {
    try {
      const storageKey = 'engine_blog_like_key'
      const existing = localStorage.getItem(storageKey)
      if (existing && existing.trim()) {
        setLikeKey(existing)
        return
      }
      const created = crypto.randomUUID()
      localStorage.setItem(storageKey, created)
      setLikeKey(created)
    } catch {
      // ignore
    }
  }, [])

  // Must call all hooks before any conditional returns (Rules of Hooks)
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useApi<ApiComment[]>(
    post?.id ? `/comments/post/${post.id}` : '',
    { skip: !post?.id }
  );

  const likesEndpoint = useMemo(() => {
    if (!post?.id || !likeKey) return ''
    const params = new URLSearchParams({ likeKey })
    return `/posts/${post.id}/likes?${params.toString()}`
  }, [post?.id, likeKey])

  const { data: likeStatus, refetch: refetchLikes } = useApi<LikeStatus>(
    likesEndpoint,
    { skip: !post?.id || !likeKey }
  )

  const { mutate: mutateLike, isLoading: isLiking } = useApiMutation<{ likesCount: number; liked: boolean }, { likeKey: string }>()

  const siteName = settings.siteName || 'Engine Blog';
  const siteUrl = settings.siteUrl || window.location.origin;
  const logoUrl = settings.logoUrl;

  function onCommentSubmitted() {
    refetch();
    refetchComments();
  }

  async function toggleLike() {
    if (!post?.id || !likeKey) return

    const endpoint = likeStatus?.liked ? `/posts/${post.id}/unlike` : `/posts/${post.id}/like`
    const data = await mutateLike(endpoint, { likeKey }, 'POST')
    if (data) {
      refetchLikes()
    }
  }

  if (isLoading) {
    return (
      <BlogLayout>
        <PostSkeleton />
      </BlogLayout>
    );
  }

  if (!post) {
    return (
      <BlogLayout>
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold mb-4">Post not found</h1>
          <p className="text-muted-foreground">
            The post you're looking for doesn't exist.
          </p>
        </div>
      </BlogLayout>
    );
  }

  const postUrl = `${siteUrl}/post/${post.slug}`;
  const authorName = post.author?.name || siteName;
  const wordCount = post.content ? post.content.split(/\s+/).length : undefined;
  const articleSection = post.categories?.[0]?.name;
  const keywords = post.tags?.map((t) => t.name);
  const publishedAt = post.publishedAt || post.createdAt;
  const description = post.excerpt ?? (post.content ? post.content.substring(0, 160) : undefined);

  return (
    <BlogLayout>
      <SEO
        title={post.title}
        description={description}
        image={post.featuredImage ?? undefined}
        url={postUrl}
        type="article"
        publishedTime={publishedAt}
        modifiedTime={post.updatedAt}
        author={authorName}
        section={articleSection}
        tags={keywords}
      >
        <BlogPostingSchema
          headline={post.title}
          description={post.excerpt ?? post.content?.substring(0, 160) ?? ''}
          image={post.featuredImage ?? undefined}
          datePublished={publishedAt}
          dateModified={post.updatedAt}
          authorName={authorName}
          publisherName={siteName}
          publisherLogo={logoUrl}
          url={postUrl}
          wordCount={wordCount}
          articleSection={articleSection}
          keywords={keywords}
        />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: siteUrl },
            { name: post.title, url: postUrl },
          ]}
        />
      </SEO>

      <PostContent post={post} />

      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          variant={likeStatus?.liked ? 'default' : 'outline'}
          onClick={toggleLike}
          disabled={!likeKey || isLiking}
          className="h-11"
        >
          <Heart className="h-4 w-4 mr-2" fill={likeStatus?.liked ? 'currentColor' : 'none'} />
          {likeStatus?.liked ? 'Liked' : 'Like'}
        </Button>
        <div className="text-sm text-muted-foreground">
          {(likeStatus?.likesCount ?? post.likesCount ?? 0).toLocaleString()} like{(likeStatus?.likesCount ?? post.likesCount ?? 0) === 1 ? '' : 's'}
        </div>
      </div>

      <Separator className="my-12" />

      <div className="space-y-8">
        {commentsLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading comments…</div>
        ) : (
          <CommentSection comments={comments || []} />
        )}
        {settings.allowComments === false ? (
          <div className="text-sm text-muted-foreground">
            Comments are disabled.
          </div>
        ) : (
          <CommentForm
            postId={post.id}
            onCommentSubmitted={onCommentSubmitted}
            moderationRequired={settings.moderateComments !== false}
          />
        )}
      </div>
    </BlogLayout>
  );
}
