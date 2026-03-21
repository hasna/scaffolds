import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createCommentSchema, updateCommentStatusSchema, commentFiltersSchema } from '../../shared/validators'
import {
  getCommentsByPostId,
  getAllComments,
  createComment,
  getTopComments,
  updateCommentStatus,
  deleteComment,
} from '../services/comment'
import { authMiddleware, requireRole } from '../middleware/auth'

const comments = new Hono()

// GET /top - top comments (public, only approved)
comments.get('/top', zValidator('query', z.object({
  limit: z.coerce.number().int().positive().max(20).default(5),
})), async (c) => {
  try {
    const { limit } = c.req.valid('query')
    const result = await getTopComments(limit)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get top comments error:', error)
    return c.json({ success: false, error: 'Failed to get top comments' }, 500)
  }
})

// GET /post/:postId - get comments for post (public)
comments.get('/post/:postId', async (c) => {
  try {
    const postId = c.req.param('postId')

    const result = await getCommentsByPostId(postId)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return c.json({ success: false, error: 'Failed to get comments' }, 500)
  }
})

// GET / - list all comments for moderation (protected)
comments.get('/', authMiddleware, requireRole('admin', 'editor'), zValidator('query', commentFiltersSchema), async (c) => {
  try {
    const filters = c.req.valid('query')

    const result = await getAllComments(filters)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get all comments error:', error)
    return c.json({ success: false, error: 'Failed to get comments' }, 500)
  }
})

// POST / - create comment (public)
comments.post('/', zValidator('json', createCommentSchema), async (c) => {
  try {
    const data = c.req.valid('json')

    const comment = await createComment(data)

    return c.json({
      success: true,
      data: comment,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create comment'
    if (message === 'Post not found') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    if (message === 'Comments are disabled') {
      return c.json({ success: false, error: 'Comments are disabled' }, 403)
    }
    if (message === 'Parent comment not found' || message === 'Invalid parent comment') {
      return c.json({ success: false, error: message }, 400)
    }
    console.error('Create comment error:', error)
    return c.json({ success: false, error: 'Failed to create comment' }, 500)
  }
})

// PUT /:id - update comment status (protected)
comments.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'editor'),
  zValidator('json', updateCommentStatusSchema),
  async (c) => {
    try {
      const id = c.req.param('id')
      const { status } = c.req.valid('json')

      const comment = await updateCommentStatus(id, status)
      if (!comment) {
        return c.json({ success: false, error: 'Comment not found' }, 404)
      }

      return c.json({
        success: true,
        data: comment,
      })
    } catch (error) {
      console.error('Update comment error:', error)
      return c.json({ success: false, error: 'Failed to update comment' }, 500)
    }
  }
)

// DELETE /:id - delete comment (protected)
comments.delete('/:id', authMiddleware, requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')

    const success = await deleteComment(id)
    if (!success) {
      return c.json({ success: false, error: 'Comment not found' }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'Comment deleted successfully' },
    })
  } catch (error) {
    console.error('Delete comment error:', error)
    return c.json({ success: false, error: 'Failed to delete comment' }, 500)
  }
})

export default comments
