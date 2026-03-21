import { Hono } from 'hono'
import { authMiddleware, requireRole, optionalAuth } from '../middleware/auth'
import {
  getAllPages,
  getPublishedPages,
  getNavPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
} from '../services/page'
import type { AppEnv } from '../types'

const pages = new Hono<AppEnv>()

// Public routes

// GET /nav - get pages for navigation (public)
pages.get('/nav', async (c) => {
  try {
    const navPages = await getNavPages()
    return c.json({ success: true, data: navPages })
  } catch (error) {
    console.error('Get nav pages error:', error)
    return c.json({ success: false, error: 'Failed to get pages' }, 500)
  }
})

// GET /:slug - get page by slug (public)
pages.get('/:slug', optionalAuth, async (c) => {
  try {
    const slug = c.req.param('slug')
    const page = await getPageBySlug(slug)

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404)
    }

    // If page is draft, only authenticated users can see it
    const user = c.get('user')
    if (page.status === 'draft' && !user) {
      return c.json({ success: false, error: 'Page not found' }, 404)
    }

    return c.json({ success: true, data: page })
  } catch (error) {
    console.error('Get page error:', error)
    return c.json({ success: false, error: 'Failed to get page' }, 500)
  }
})

// Protected routes (admin only)

// GET /id/:id - get page by ID (admin)
pages.get('/id/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const page = await getPageById(id)

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404)
    }

    return c.json({ success: true, data: page })
  } catch (error) {
    console.error('Get page by ID error:', error)
    return c.json({ success: false, error: 'Failed to get page' }, 500)
  }
})

// GET / - get all pages (admin)
pages.get('/', authMiddleware, async (c) => {
  try {
    const allPages = await getAllPages()
    return c.json({ success: true, data: allPages })
  } catch (error) {
    console.error('Get all pages error:', error)
    return c.json({ success: false, error: 'Failed to get pages' }, 500)
  }
})

// POST / - create page
pages.post('/', authMiddleware, requireRole('admin', 'editor'), async (c) => {
  try {
    const body = await c.req.json()

    const page = await createPage({
      title: body.title,
      slug: body.slug,
      content: body.content,
      status: body.status,
      showInNav: body.showInNav,
      navOrder: body.navOrder,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
    })

    return c.json({ success: true, data: page }, 201)
  } catch (error) {
    console.error('Create page error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create page' },
      500
    )
  }
})

// PUT /:id - update page
pages.put('/:id', authMiddleware, requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    const page = await updatePage(id, {
      title: body.title,
      slug: body.slug,
      content: body.content,
      status: body.status,
      showInNav: body.showInNav,
      navOrder: body.navOrder,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
    })

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404)
    }

    return c.json({ success: true, data: page })
  } catch (error) {
    console.error('Update page error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update page' },
      500
    )
  }
})

// DELETE /:id - delete page
pages.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const deleted = await deletePage(id)

    if (!deleted) {
      return c.json({ success: false, error: 'Page not found' }, 404)
    }

    return c.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Delete page error:', error)
    return c.json({ success: false, error: 'Failed to delete page' }, 500)
  }
})

export default pages
