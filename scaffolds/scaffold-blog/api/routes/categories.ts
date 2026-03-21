import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createCategorySchema, updateCategorySchema } from '../../shared/validators'
import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/category'
import { getAllPosts } from '../services/post'
import { authMiddleware, requireRole } from '../middleware/auth'

const categories = new Hono()

// GET / - list all categories (public)
categories.get('/', async (c) => {
  try {
    const result = await getAllCategories()

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return c.json({ success: false, error: 'Failed to get categories' }, 500)
  }
})

// GET /:slug - get category by slug with posts (public)
categories.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')

    const category = await getCategoryBySlug(slug)
    if (!category) {
      return c.json({ success: false, error: 'Category not found' }, 404)
    }

    const posts = await getAllPosts({
      status: 'published',
      categoryId: category.id,
      page: 1,
      pageSize: 100,
    })

    return c.json({
      success: true,
      data: { ...category, posts: posts.data },
    })
  } catch (error) {
    console.error('Get category error:', error)
    return c.json({ success: false, error: 'Failed to get category' }, 500)
  }
})

// POST / - create category (protected)
categories.post(
  '/',
  authMiddleware,
  requireRole('admin', 'editor'),
  zValidator('json', createCategorySchema),
  async (c) => {
    try {
      const data = c.req.valid('json')

      const category = await createCategory(data)

      return c.json({
        success: true,
        data: category,
      })
    } catch (error) {
      console.error('Create category error:', error)
      return c.json({ success: false, error: 'Failed to create category' }, 500)
    }
  }
)

// PUT /:id - update category (protected)
categories.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'editor'),
  zValidator('json', updateCategorySchema.partial()),
  async (c) => {
    try {
      const id = c.req.param('id')
      const data = c.req.valid('json')

      const category = await updateCategory(id, data)
      if (!category) {
        return c.json({ success: false, error: 'Category not found' }, 404)
      }

      return c.json({
        success: true,
        data: category,
      })
    } catch (error) {
      console.error('Update category error:', error)
      return c.json({ success: false, error: 'Failed to update category' }, 500)
    }
  }
)

// DELETE /:id - delete category (protected)
categories.delete('/:id', authMiddleware, requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')

    const success = await deleteCategory(id)
    if (!success) {
      return c.json({ success: false, error: 'Category not found' }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'Category deleted successfully' },
    })
  } catch (error) {
    console.error('Delete category error:', error)
    return c.json({ success: false, error: 'Failed to delete category' }, 500)
  }
})

export default categories
