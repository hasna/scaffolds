import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { findOne, findMany } from '../db'
import { updateCommentStatus, deleteComment } from '../services/comment'

const admin = new Hono()

// All admin routes require authentication
admin.use('*', authMiddleware)

// GET /stats - get dashboard statistics
admin.get('/stats', async (c) => {
  try {
    // Get post counts
    const totalPostsResult = await findOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM posts'
    )
    const publishedPostsResult = await findOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM posts WHERE status = 'published'"
    )
    const draftPostsResult = await findOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM posts WHERE status = 'draft'"
    )

    // Get pending comments count
    const pendingCommentsResult = await findOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM comments WHERE status = 'pending'"
    )

    // Get recent posts as activity
    const recentPosts = await findMany<{ title: string; created_at: string; status: string }>(
      'SELECT title, created_at, status FROM posts ORDER BY created_at DESC LIMIT 5'
    )

    const recentActivity = recentPosts.map((post) => ({
      message: `Post "${post.title}" ${post.status === 'published' ? 'published' : 'created as draft'}`,
      timestamp: new Date(post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }))

    return c.json({
      success: true,
      data: {
        totalPosts: parseInt(totalPostsResult?.count || '0'),
        publishedPosts: parseInt(publishedPostsResult?.count || '0'),
        draftPosts: parseInt(draftPostsResult?.count || '0'),
        pendingComments: parseInt(pendingCommentsResult?.count || '0'),
        recentActivity,
      },
    })
  } catch (error) {
    console.error('Get admin stats error:', error)
    return c.json({ success: false, error: 'Failed to get stats' }, 500)
  }
})

function mapAdminCommentStatus(status: string): 'pending' | 'approved' | 'rejected' {
  if (status === 'approved') return 'approved'
  if (status === 'pending') return 'pending'
  return 'rejected'
}

// GET /comments - list comments for moderation (admin/editor)
admin.get('/comments', requireRole('admin', 'editor'), async (c) => {
  try {
    const rows = await findMany<{
      id: string
      author_name: string
      author_email: string
      content: string
      status: string
      created_at: string
      post_title: string | null
    }>(
      `SELECT
        c.id,
        c.author_name,
        c.author_email,
        c.content,
        c.status,
        c.created_at,
        p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON p.id = c.post_id
      ORDER BY c.created_at DESC
      LIMIT 200`
    )

    const data = rows.map((r) => ({
      id: r.id,
      author: r.author_name,
      email: r.author_email,
      content: r.content,
      status: mapAdminCommentStatus(r.status),
      createdAt: r.created_at,
      post: r.post_title ? { title: r.post_title } : null,
    }))

    return c.json({ success: true, data })
  } catch (error) {
    console.error('Get admin comments error:', error)
    return c.json({ success: false, error: 'Failed to get comments' }, 500)
  }
})

// PATCH /comments/:id/approve - approve comment (admin/editor)
admin.patch('/comments/:id/approve', requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')
    const updated = await updateCommentStatus(id, 'approved')
    if (!updated) return c.json({ success: false, error: 'Comment not found' }, 404)
    return c.json({ success: true, data: updated })
  } catch (error) {
    console.error('Approve comment error:', error)
    return c.json({ success: false, error: 'Failed to approve comment' }, 500)
  }
})

// PATCH /comments/:id/reject - reject comment (admin/editor)
admin.patch('/comments/:id/reject', requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')
    const updated = await updateCommentStatus(id, 'spam')
    if (!updated) return c.json({ success: false, error: 'Comment not found' }, 404)
    return c.json({ success: true, data: updated })
  } catch (error) {
    console.error('Reject comment error:', error)
    return c.json({ success: false, error: 'Failed to reject comment' }, 500)
  }
})

// DELETE /comments/:id - delete comment (admin/editor)
admin.delete('/comments/:id', requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')
    const ok = await deleteComment(id)
    if (!ok) return c.json({ success: false, error: 'Comment not found' }, 404)
    return c.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Delete comment error:', error)
    return c.json({ success: false, error: 'Failed to delete comment' }, 500)
  }
})

export default admin
