import { findOne, findMany, run, count, generateId, now } from '../db'
import type { Comment, PaginatedResponse } from '../../shared/types'
import type { CreateCommentInput, CommentFilters } from '../../shared/validators'
import { getSettingValue } from './settings'

interface CommentRow {
  id: string
  post_id: string
  parent_id: string | null
  author_name: string
  author_email: string
  content: string
  status: 'pending' | 'approved' | 'spam' | 'deleted'
  created_at: string
}

interface TopCommentRow {
  id: string
  content: string
  author_name: string
  created_at: string
  post_slug: string
  post_title: string
  post_likes_count: number
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  }
}

export async function getTopComments(limit: number): Promise<Array<{
  id: string
  content: string
  authorName: string
  createdAt: string
  likesCount: number
  post: { slug: string; title: string }
}>> {
  const rows = await findMany<TopCommentRow>(
    `SELECT
      c.id,
      c.content,
      c.author_name,
      c.created_at,
      p.slug as post_slug,
      p.title as post_title,
      COALESCE(p.likes_count, 0) as post_likes_count
    FROM comments c
    JOIN posts p ON p.id = c.post_id
    WHERE c.status = $1 AND p.status = $2
    ORDER BY c.created_at DESC
    LIMIT $3`,
    ['approved', 'published', limit]
  )

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
    likesCount: row.post_likes_count,
    post: { slug: row.post_slug, title: row.post_title },
  }))
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>()
  const rootComments: Comment[] = []

  // First pass: create map and initialize replies array
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: build tree structure
  comments.forEach((comment) => {
    const commentWithReplies = commentMap.get(comment.id)!
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId)
      if (parent) {
        parent.replies!.push(commentWithReplies)
      } else {
        // Parent doesn't exist, treat as root
        rootComments.push(commentWithReplies)
      }
    } else {
      rootComments.push(commentWithReplies)
    }
  })

  return rootComments
}

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const rows = await findMany<CommentRow>(
    'SELECT * FROM comments WHERE post_id = $1 AND status = $2 ORDER BY created_at ASC',
    [postId, 'approved']
  )

  const comments = rows.map(rowToComment)
  return buildCommentTree(comments)
}

export async function getAllComments(filters: CommentFilters): Promise<PaginatedResponse<Comment>> {
  const { page = 1, pageSize = 20, status, postId } = filters

  let whereClauses: string[] = []
  let params: unknown[] = []
  let paramIndex = 1

  if (status) {
    whereClauses.push(`status = $${paramIndex++}`)
    params.push(status)
  }

  if (postId) {
    whereClauses.push(`post_id = $${paramIndex++}`)
    params.push(postId)
  }

  const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

  // Get total count
  const totalCount = await count(`SELECT COUNT(*) as count FROM comments ${whereClause}`, params)

  // Get paginated comments
  const offset = (page - 1) * pageSize
  const rows = await findMany<CommentRow>(
    `SELECT * FROM comments ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, pageSize, offset]
  )

  const comments = rows.map(rowToComment)

  return {
    data: comments,
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

export async function createComment(data: CreateCommentInput): Promise<Comment> {
  const allowComments = await getSettingValue<boolean>('allowComments')
  if (allowComments === false) {
    throw new Error('Comments are disabled')
  }

  const post = await findOne<{ status: string }>('SELECT status FROM posts WHERE id = $1', [data.postId])
  if (!post || post.status !== 'published') {
    throw new Error('Post not found')
  }

  if (data.parentId) {
    const parent = await findOne<{ post_id: string }>('SELECT post_id FROM comments WHERE id = $1', [data.parentId])
    if (!parent) throw new Error('Parent comment not found')
    if (parent.post_id !== data.postId) throw new Error('Invalid parent comment')
  }

  const moderateComments = await getSettingValue<boolean>('moderateComments')
  const status: 'pending' | 'approved' =
    moderateComments === false ? 'approved' : 'pending'

  const id = generateId()
  const timestamp = now()

  await run(
    'INSERT INTO comments (id, post_id, parent_id, author_name, author_email, content, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      id,
      data.postId,
      data.parentId || null,
      data.authorName,
      data.authorEmail,
      data.content,
      status,
      timestamp,
    ]
  )

  const comment = await findOne<CommentRow>('SELECT * FROM comments WHERE id = $1', [id])
  if (!comment) throw new Error('Failed to create comment')
  return rowToComment(comment)
}

export async function updateCommentStatus(
  id: string,
  status: 'pending' | 'approved' | 'spam' | 'deleted'
): Promise<Comment | null> {
  const existing = await findOne<CommentRow>('SELECT * FROM comments WHERE id = $1', [id])
  if (!existing) return null

  await run('UPDATE comments SET status = $1 WHERE id = $2', [status, id])

  const updated = await findOne<CommentRow>('SELECT * FROM comments WHERE id = $1', [id])
  if (!updated) return null
  return rowToComment(updated)
}

export async function deleteComment(id: string): Promise<boolean> {
  const result = await run('DELETE FROM comments WHERE id = $1', [id])
  return result.rowCount > 0
}
