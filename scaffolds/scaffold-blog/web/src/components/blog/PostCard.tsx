import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate, formatRelativeTime, truncate } from '@/lib/utils'
import type { PostSummary } from '@/types/post'
import { Heart } from 'lucide-react'
import { getExcerptParagraphs } from '@/lib/excerpt'
import { getResizedUploadsImageSrcSet, getResizedUploadsImageUrl } from '@/lib/image'

interface PostCardProps {
  post: PostSummary;
  excerptMaxChars?: number;
  excerptLines?: 2 | 3 | 6;
  excerptParagraphs?: number;
}

export function PostCard({ post, excerptMaxChars, excerptLines, excerptParagraphs }: PostCardProps) {
  const multiParagraph = typeof excerptParagraphs === 'number' && excerptParagraphs > 1
  const excerpt = post.excerpt || truncate(post.content || '', excerptMaxChars ?? 150)
  const excerptParts = (() => {
    if (!multiParagraph) return []
    const maxParagraphs = excerptParagraphs
    const maxChars = excerptMaxChars ?? 900
    const minWanted = Math.min(3, maxParagraphs)

    const fromExcerpt = getExcerptParagraphs(
      { excerpt: post.excerpt || null, content: null },
      { maxParagraphs, maxChars }
    )
    if (fromExcerpt.length >= minWanted) return fromExcerpt

    const fromContent = getExcerptParagraphs(
      { excerpt: null, content: post.content || null },
      { maxParagraphs, maxChars }
    )
    return fromContent.length > 0 ? fromContent : fromExcerpt
  })()
  const authorName = post.author?.name || 'Engine Blog'
  const authorAvatar = post.author?.avatar || null
  const publishedAt = post.publishedAt || post.createdAt
  const clampClass = excerptLines === 6 ? 'line-clamp-6' : excerptLines === 2 ? 'line-clamp-2' : 'line-clamp-3'
  const absoluteDate = formatDate(publishedAt)
  const relativeDate = formatRelativeTime(publishedAt)
  const featuredSrc = post.featuredImage
    ? getResizedUploadsImageUrl(post.featuredImage, { width: 1200, quality: 82 })
    : null
  const featuredSrcSet = post.featuredImage
    ? getResizedUploadsImageSrcSet(post.featuredImage, [600, 900, 1200], { quality: 82 })
    : undefined

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow active:scale-[0.99]">
      {post.featuredImage && (
        <Link to={`/post/${post.slug}`} className="block">
          <div className="aspect-[16/7] w-full overflow-hidden">
            <img
              src={featuredSrc ?? post.featuredImage}
              srcSet={featuredSrcSet}
              sizes="(max-width: 640px) 100vw, 720px"
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          </div>
        </Link>
      )}
      <CardHeader className="p-4 sm:p-6">
        <Link to={`/post/${post.slug}`}>
          <h2 className="text-xl sm:text-2xl font-bold hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-2 sm:px-6 sm:pb-4">
        {multiParagraph && excerptParts.length > 0 ? (
          <div className="space-y-3">
            {excerptParts.map((p, idx) => (
              <p key={idx} className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className={`text-sm sm:text-base text-muted-foreground ${clampClass}`}>{excerpt}</p>
        )}
      </CardContent>
      <CardFooter className="px-4 pb-4 sm:px-6 sm:pb-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6">
            {authorAvatar ? <AvatarImage src={authorAvatar} alt={authorName} /> : null}
            <AvatarFallback className="text-[10px]">
              {authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">
            By <span className="text-foreground">{authorName}</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
          <span className="shrink-0" title={absoluteDate}>{relativeDate}</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span>{(post.likesCount ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
