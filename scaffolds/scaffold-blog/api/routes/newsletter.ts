import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { newsletterSubscribeSchema, paginationSchema } from '../../shared/validators'
import { deleteNewsletterSubscriber, listNewsletterSubscribers, upsertNewsletterSubscriber } from '../services/newsletter'
import { authMiddleware, requireRole } from '../middleware/auth'
import { z } from 'zod'

const newsletter = new Hono()

// POST /subscribe - subscribe to newsletter (public)
newsletter.post('/subscribe', zValidator('json', newsletterSubscribeSchema), async (c) => {
  try {
    const data = c.req.valid('json')

    const result = await upsertNewsletterSubscriber({
      email: data.email,
      phone: data.phone,
      source: 'footer',
    })

    return c.json({
      success: true,
      data: {
        subscribed: true,
        alreadySubscribed: result.alreadySubscribed,
      },
    })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return c.json({ success: false, error: 'Failed to subscribe' }, 500)
  }
})

// Protected routes
newsletter.use('*', authMiddleware)

const newsletterListSchema = paginationSchema.extend({
  search: z.string().optional(),
})

// GET /subscribers - list newsletter subscribers (admin only)
newsletter.get('/subscribers', requireRole('admin'), zValidator('query', newsletterListSchema), async (c) => {
  try {
    const query = c.req.valid('query')

    const result = await listNewsletterSubscribers({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
    })

    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('List newsletter subscribers error:', error)
    return c.json({ success: false, error: 'Failed to list subscribers' }, 500)
  }
})

// DELETE /subscribers/:id - delete subscriber (admin only)
newsletter.delete('/subscribers/:id', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const deleted = await deleteNewsletterSubscriber(id)
    if (!deleted) {
      return c.json({ success: false, error: 'Subscriber not found' }, 404)
    }
    return c.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Delete newsletter subscriber error:', error)
    return c.json({ success: false, error: 'Failed to delete subscriber' }, 500)
  }
})

export default newsletter
