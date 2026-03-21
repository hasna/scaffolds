import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiMutation } from '@/hooks/useApi'

interface CommentFormProps {
  postId: string
  onCommentSubmitted: () => void
  moderationRequired?: boolean
}

export function CommentForm({ postId, onCommentSubmitted, moderationRequired = true }: CommentFormProps) {
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [content, setContent] = useState('')
  const [successState, setSuccessState] = useState(false)

  const { mutate, isLoading, error } = useApiMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await mutate('/comments', {
      postId,
      authorName,
      authorEmail,
      content,
    })

    if (result) {
      setAuthorName('')
      setAuthorEmail('')
      setContent('')
      setSuccessState(true)
      onCommentSubmitted()

      setTimeout(() => setSuccessState(false), 5000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Comment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">Name *</Label>
              <Input
                id="author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Comment *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="Your comment..."
              rows={5}
            />
          </div>
          {error && (
            <div className="text-sm text-destructive">{error.message}</div>
          )}
          {successState && (
            <div className="text-sm text-green-600">
              {moderationRequired
                ? 'Comment submitted successfully! It will appear after approval.'
                : 'Comment posted successfully.'}
            </div>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Comment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
