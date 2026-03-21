import { useMemo } from 'react';
import { marked } from 'marked';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLinkPreviewSheet } from '@/components/link-preview/LinkPreviewSheetProvider'
import { getPreviewUrl } from '@/lib/linkPreview'
import { getResizedUploadsImageSrcSet, getResizedUploadsImageUrl } from '@/lib/image'

// Configure marked for safe HTML output
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface PostContentProps {
  post: {
    id: string;
    title: string;
    slug: string;
    content: string | null;
    featuredImage?: string | null;
    publishedAt: string | null;
    authorId?: string | null;
    author?: {
      name: string;
      email?: string;
      avatar?: string | null;
    };
    categories?: Array<{
      name: string;
      slug: string;
    }>;
    tags?: Array<{
      name: string;
      slug: string;
    }>;
  };
}

export function PostContent({ post }: PostContentProps) {
  const { openLink } = useLinkPreviewSheet()
  // Convert markdown to HTML
  const htmlContent = useMemo(() => {
    if (!post.content) return '';
    return marked(post.content) as string;
  }, [post.content]);

  const publishedAt = post.publishedAt || null
  const absoluteDate = publishedAt ? formatDate(publishedAt) : null
  const relativeDate = publishedAt ? formatRelativeTime(publishedAt) : null
  const authorName = post.author?.name || 'Engine Blog'
  const authorAvatar = post.author?.avatar || null
  const featuredSrc = post.featuredImage
    ? getResizedUploadsImageUrl(post.featuredImage, { width: 1600, quality: 82 })
    : null
  const featuredSrcSet = post.featuredImage
    ? getResizedUploadsImageSrcSet(post.featuredImage, [800, 1200, 1600], { quality: 82 })
    : undefined

  function onArticleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement | null
    const anchor = target?.closest?.('a') as HTMLAnchorElement | null
    if (!anchor) return

    const href = anchor.getAttribute('href') || ''
    const previewUrl = getPreviewUrl(href, window.location.origin)
    if (!previewUrl) return

    e.preventDefault()
    e.stopPropagation()

    const title = (anchor.textContent || '').trim() || undefined
    openLink(previewUrl, title)
  }

  return (
    <article onClick={onArticleClick}>
      {post.featuredImage && (
        <div className="aspect-[16/7] w-full overflow-hidden rounded-lg mb-8">
          <img
            src={featuredSrc ?? post.featuredImage}
            srcSet={featuredSrcSet}
            sizes="(max-width: 768px) 100vw, 1000px"
            alt={post.title}
            className="w-full h-full object-cover"
            decoding="async"
          />
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6">
              {authorAvatar ? <AvatarImage src={authorAvatar} alt={authorName} /> : null}
              <AvatarFallback className="text-[10px]">
                {authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">By {authorName}</span>
          </div>
          <span>•</span>
          {publishedAt && absoluteDate && relativeDate && (
            <span title={absoluteDate}>{relativeDate}</span>
          )}
        </div>
      </header>

      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {post.tags && post.tags.length > 0 && (
        <>
          <Separator className="my-8" />
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-2">Tags:</span>
            {post.tags.map((tag) => (
              <Link key={tag.slug} to={`/tag/${tag.slug}`}>
                <Badge variant="outline">{tag.name}</Badge>
              </Link>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
