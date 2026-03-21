import { apiRequest, formatTable, log, error, success } from '../lib/api'
import type { Comment } from '../../shared/types'

export async function listComments(options: {
  status?: string
  postId?: string
  json?: boolean
}): Promise<void> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.postId) params.set('postId', options.postId)

  const result = await apiRequest<{ data: Comment[]; total: number }>(
    `/api/comments?${params.toString()}`
  )

  if (!result.success) {
    error(result.error || 'Failed to fetch comments')
    return
  }

  const comments = result.data?.data || []

  if (options.json) {
    log(JSON.stringify(comments, null, 2))
    return
  }

  log(
    formatTable(
      comments.map((c) => ({
        id: c.id.slice(0, 8),
        author: c.authorName.slice(0, 15),
        content: c.content.slice(0, 30) + (c.content.length > 30 ? '...' : ''),
        status: c.status,
        created: c.createdAt.slice(0, 10),
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'author', label: 'Author', width: 15 },
        { key: 'content', label: 'Content', width: 33 },
        { key: 'status', label: 'Status', width: 10 },
        { key: 'created', label: 'Created', width: 10 },
      ]
    )
  )

  log(`\nTotal: ${comments.length} comments`)
}

export async function approveComment(id: string): Promise<void> {
  const result = await apiRequest<Comment>(`/api/comments/${id}`, {
    method: 'PUT',
    body: { status: 'approved' },
  })

  if (!result.success) {
    error(result.error || 'Failed to approve comment')
    return
  }

  success('Comment approved')
}

export async function spamComment(id: string): Promise<void> {
  const result = await apiRequest<Comment>(`/api/comments/${id}`, {
    method: 'PUT',
    body: { status: 'spam' },
  })

  if (!result.success) {
    error(result.error || 'Failed to mark comment as spam')
    return
  }

  success('Comment marked as spam')
}

export async function deleteComment(id: string): Promise<void> {
  const result = await apiRequest(`/api/comments/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete comment')
    return
  }

  success('Comment deleted')
}
