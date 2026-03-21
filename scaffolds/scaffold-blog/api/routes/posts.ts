import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createPostSchema, updatePostSchema, postFiltersSchema } from '../../shared/validators'
import {
  getAllPosts,
  getTopPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../services/post'
import { getLikeStatus, likePost, unlikePost } from '../services/like'
import { getUserById } from '../services/user'
import { authMiddleware, optionalAuth, requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

const posts = new Hono<AppEnv>()

posts.get('/:id/likes', zValidator('query', z.object({
  likeKey: z.string().optional(),
})), async (c) => {
  try {
    const id = c.req.param('id')
    const { likeKey } = c.req.valid('query')
    const data = await getLikeStatus(id, likeKey)
    return c.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get like status'
    if (message === 'Post not found') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    console.error('Get like status error:', error)
    return c.json({ success: false, error: 'Failed to get like status' }, 500)
  }
})

posts.post('/:id/like', zValidator('json', z.object({
  likeKey: z.string().min(1),
})), async (c) => {
  try {
    const id = c.req.param('id')
    const { likeKey } = c.req.valid('json')
    const data = await likePost(id, likeKey)
    return c.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to like post'
    if (message === 'Post not found') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    console.error('Like post error:', error)
    return c.json({ success: false, error: 'Failed to like post' }, 500)
  }
})

posts.post('/:id/unlike', zValidator('json', z.object({
  likeKey: z.string().min(1),
})), async (c) => {
  try {
    const id = c.req.param('id')
    const { likeKey } = c.req.valid('json')
    const data = await unlikePost(id, likeKey)
    return c.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unlike post'
    if (message === 'Post not found') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    console.error('Unlike post error:', error)
    return c.json({ success: false, error: 'Failed to unlike post' }, 500)
  }
})

// GET /top - top posts (public, only published)
posts.get('/top', zValidator('query', z.object({
  limit: z.coerce.number().int().positive().max(20).default(5),
})), async (c) => {
  try {
    const { limit } = c.req.valid('query')
    const result = await getTopPosts(limit)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get top posts error:', error)
    return c.json({ success: false, error: 'Failed to get top posts' }, 500)
  }
})

// GET / - list posts (public, only published)
posts.get('/', optionalAuth, zValidator('query', postFiltersSchema), async (c) => {
  try {
    const filters = c.req.valid('query')

    const user = c.get('user')
    const includeUnpublished =
      c.req.query('includeUnpublished') === '1' ||
      c.req.query('includeUnpublished') === 'true'

    // Public: force published
    if (!user && !includeUnpublished) {
      const publicFilters = { ...filters, status: 'published' as const }
      const result = await getAllPosts(publicFilters)
      return c.json({ success: true, data: result })
    }

    if (!user && includeUnpublished) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    // Authenticated: admins/editors can see all; authors only their own posts
    const authenticatedFilters = user.role === 'author'
      ? { ...filters, authorId: user.id }
      : filters

    // Authenticated without includeUnpublished: still force published
    const effectiveFilters = includeUnpublished ? authenticatedFilters : { ...authenticatedFilters, status: 'published' as const }

    const result = await getAllPosts(effectiveFilters)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get posts error:', error)
    return c.json({ success: false, error: 'Failed to get posts' }, 500)
  }
})

// GET /id/:id - get post by id (protected; used for admin editing)
posts.get('/id/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')

    const post = await getPostById(id)
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    if (user.role === 'author' && post.authorId !== user.id) {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    return c.json({ success: true, data: post })
  } catch (error) {
    console.error('Get post by id error:', error)
    return c.json({ success: false, error: 'Failed to get post' }, 500)
  }
})

// GET /:slug - get post by slug (public)
posts.get('/:slug', optionalAuth, async (c) => {
  try {
    const slug = c.req.param('slug')

    const post = await getPostBySlug(slug)
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    const user = c.get('user')
    const preview =
      c.req.query('preview') === '1' ||
      c.req.query('preview') === 'true'

    // Public access: only published
    if (!user && post.status !== 'published') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // Authenticated, but no preview: only published
    if (user && !preview && post.status !== 'published') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // Preview requires auth
    if (!user && preview) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    // Preview: authors can only access their own drafts
    if (preview && user?.role === 'author' && post.authorId !== user.id) {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    return c.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Get post error:', error)
    return c.json({ success: false, error: 'Failed to get post' }, 500)
  }
})

// POST / - create post (protected, editor+)
posts.post(
  '/',
  authMiddleware,
  requireRole('admin', 'editor'),
  zValidator('json', createPostSchema),
  async (c) => {
    try {
      const user = c.get('user')
      const data = c.req.valid('json')

      let authorId = user.id
      if (user.role === 'admin' && data.authorId) {
        const target = await getUserById(data.authorId)
        if (!target) {
          return c.json({ success: false, error: 'Author not found' }, 400)
        }
        authorId = data.authorId
      }

      const post = await createPost(data, authorId)

      return c.json({
        success: true,
        data: post,
      })
    } catch (error) {
      console.error('Create post error:', error)
      return c.json({ success: false, error: 'Failed to create post' }, 500)
    }
  }
)

// PUT /:id - update post (protected)
posts.put('/:id', authMiddleware, zValidator('json', updatePostSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const user = c.get('user')

    if (data.authorId !== undefined && user.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }
    if (user.role === 'admin' && data.authorId) {
      const target = await getUserById(data.authorId)
      if (!target) {
        return c.json({ success: false, error: 'Author not found' }, 400)
      }
    }

    // Check if post exists
    const existing = await getPostById(id)
    if (!existing) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // Check permissions - editors and authors can only edit their own posts, admins can edit all
    if (user.role !== 'admin' && existing.authorId !== user.id) {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    const post = await updatePost(id, data)

    return c.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Update post error:', error)
    return c.json({ success: false, error: 'Failed to update post' }, 500)
  }
})

// DELETE /:id - delete post (protected, admin only)
posts.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')

    const success = await deletePost(id)
    if (!success) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'Post deleted successfully' },
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return c.json({ success: false, error: 'Failed to delete post' }, 500)
  }
})

export default posts
