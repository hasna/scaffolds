import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, truncate } from '@/lib/utils'

interface TopPost {
  id: string
  title: string
  slug: string
  createdAt: string
  publishedAt: string | null
  authorName: string | null
}

interface TopComment {
  id: string
  content: string
  authorName: string
  createdAt: string
  likesCount: number
  post: { slug: string; title: string }
}

function SidebarListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}

export function RightSidebar() {
  const { data: topPosts, isLoading: isLoadingPosts } = useApi<TopPost[]>('/posts/top?limit=5')
  const { data: topComments, isLoading: isLoadingComments } = useApi<TopComment[]>('/comments/top?limit=5')

  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPosts ? (
            <SidebarListSkeleton />
          ) : (
            <ul className="space-y-4">
              {(topPosts || []).map((post) => (
                <li key={post.id} className="space-y-1">
                  <Link
                    to={`/post/${post.slug}`}
                    className="text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
                  >
                    {post.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {post.authorName ? `${post.authorName} · ` : ''}{formatRelativeTime(post.publishedAt || post.createdAt)}
                  </div>
                </li>
              ))}
              {(topPosts || []).length === 0 && (
                <li className="text-sm text-muted-foreground">No posts yet.</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingComments ? (
            <SidebarListSkeleton />
          ) : (
            <ul className="space-y-4">
              {(topComments || []).map((comment) => (
                <li key={comment.id} className="space-y-1">
                  <Link
                    to={`/post/${comment.post.slug}`}
                    className="text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
                    title={comment.post.title}
                  >
                    {comment.post.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {comment.likesCount.toLocaleString()} likes · {formatRelativeTime(comment.createdAt)}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {truncate(comment.content, 140)}
                  </div>
                </li>
              ))}
              {(topComments || []).length === 0 && (
                <li className="text-sm text-muted-foreground">No comments yet.</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
