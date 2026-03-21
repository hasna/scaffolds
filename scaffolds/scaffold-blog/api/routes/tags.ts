import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createTagSchema } from '../../shared/validators'
import { getAllTags, getTagBySlug, createTag, deleteTag } from '../services/tag'
import { getAllPosts } from '../services/post'
import { authMiddleware, requireRole } from '../middleware/auth'

const tags = new Hono()

// GET / - list all tags (public)
tags.get('/', async (c) => {
  try {
    const result = await getAllTags()

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get tags error:', error)
    return c.json({ success: false, error: 'Failed to get tags' }, 500)
  }
})

// GET /:slug - get tag by slug with posts (public)
tags.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')

    const tag = await getTagBySlug(slug)
    if (!tag) {
      return c.json({ success: false, error: 'Tag not found' }, 404)
    }

    const posts = await getAllPosts({
      status: 'published',
      tagId: tag.id,
      page: 1,
      pageSize: 100,
    })

    return c.json({
      success: true,
      data: { ...tag, posts: posts.data },
    })
  } catch (error) {
    console.error('Get tag error:', error)
    return c.json({ success: false, error: 'Failed to get tag' }, 500)
  }
})

// POST / - create tag (protected)
tags.post('/', authMiddleware, requireRole('admin', 'editor'), zValidator('json', createTagSchema), async (c) => {
  try {
    const data = c.req.valid('json')

    const tag = await createTag(data)

    return c.json({
      success: true,
      data: tag,
    })
  } catch (error) {
    console.error('Create tag error:', error)
    return c.json({ success: false, error: 'Failed to create tag' }, 500)
  }
})

// DELETE /:id - delete tag (protected)
tags.delete('/:id', authMiddleware, requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')

    const success = await deleteTag(id)
    if (!success) {
      return c.json({ success: false, error: 'Tag not found' }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'Tag deleted successfully' },
    })
  } catch (error) {
    console.error('Delete tag error:', error)
    return c.json({ success: false, error: 'Failed to delete tag' }, 500)
  }
})

export default tags
