import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'

interface Comment {
  id: string
  authorName: string
  authorEmail: string
  content: string
  createdAt: string
  status?: string
  replies?: Comment[]
}

interface CommentSectionProps {
  comments: Comment[]
}

function CommentItem({ comment, depth }: { comment: Comment; depth: number }) {
  return (
    <Card className={depth > 0 ? 'border-muted' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{comment.authorName}</p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{comment.content}</p>
        {(comment.replies || []).length > 0 && (
          <div className="mt-4 space-y-3 pl-4 border-l">
            {(comment.replies || []).map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CommentSection({ comments }: CommentSectionProps) {
  const visibleComments = comments.filter((c) => !c.status || c.status === 'approved')

  if (visibleComments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No comments yet. Be the first to comment!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">
        Comments ({visibleComments.length})
      </h2>
      {visibleComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} depth={0} />
      ))}
    </div>
  )
}
