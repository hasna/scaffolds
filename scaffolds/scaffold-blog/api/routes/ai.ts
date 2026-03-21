import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { generateArticle, getGenerationHistory } from '../ai/agent'
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAllSchedules,
  getScheduleById,
} from '../ai/scheduler'
import { aiGenerateSchema, aiScheduleSchema, aiSiteDescriptionSchema, aiCategoriesSchema, aiLogoSchema, aiAvatarSchema } from '../../shared/validators'
import { generateCategories, generateSiteDescription } from '../ai/content'
import { getSettingValue, setSetting } from '../services/settings'
import { upsertCategory } from '../services/category'
import { findMany } from '../db'
import slugify from 'slugify'
import { generateLogoPng } from '../ai/logo'
import { mkdir } from 'node:fs/promises'
import { generateAvatarPng } from '../ai/avatar'
import { getUserById, updateUser } from '../services/user'

const aiRoutes = new Hono()

// All AI routes require authentication
aiRoutes.use('*', authMiddleware)

// Generate + update siteDescription (admin only)
aiRoutes.post('/site-description', requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json()
    const validated = aiSiteDescriptionSchema.parse(body)

    const siteName = (await getSettingValue<string>('siteName')) || 'Engine Blog'

    const siteDescription = await generateSiteDescription({
      prompt: validated.prompt,
      tone: validated.tone,
      maxChars: validated.maxChars,
      siteName,
    })

    await setSetting('siteDescription', JSON.stringify(siteDescription))

    return c.json({ success: true, data: { siteDescription } })
  } catch (error) {
    console.error('Site description generation error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      500
    )
  }
})

// Generate category taxonomy (admin only). When apply=true, upserts into DB.
aiRoutes.post('/categories', requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json()
    const validated = aiCategoriesSchema.parse(body)

    const existing = await findMany<{ slug: string; name: string }>('SELECT slug, name FROM categories ORDER BY name ASC')
    const existingSlugs = new Set(existing.map((c) => c.slug))
    const existingNames = existing.map((c) => c.name)

    const generated = await generateCategories({
      prompt: validated.prompt,
      tone: validated.tone,
      count: validated.count,
      existing: existingNames,
    })

    // Deduplicate by slug
    const unique: Array<{ name: string; description: string; slug: string }> = []
    const seen = new Set<string>()
    for (const c of generated) {
      const slug = c.name ? slugify(c.name, { lower: true, strict: true }) : ''
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      unique.push({ ...c, slug })
    }

    if (!validated.apply) {
      return c.json({
        success: true,
        data: {
          applied: false,
          created: 0,
          updated: 0,
          categories: unique.map(({ slug, ...rest }) => ({ ...rest, slug })),
        },
      })
    }

    const applied = []
    let created = 0
    let updated = 0

    for (const c0 of unique) {
      const existed = existingSlugs.has(c0.slug)
      const saved = await upsertCategory({ name: c0.name, description: c0.description })
      applied.push(saved)
      if (existed) updated++
      else created++
      existingSlugs.add(c0.slug)
    }

    return c.json({
      success: true,
      data: {
        applied: true,
        created,
        updated,
        categories: applied,
      },
    })
  } catch (error) {
    console.error('Category generation error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      500
    )
  }
})

// Generate + update logoUrl + faviconUrl (admin only)
aiRoutes.post('/logo', requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json()
    const validated = aiLogoSchema.parse(body)

    const siteName = (await getSettingValue<string>('siteName')) || 'Engine Blog'

    const bytes = await generateLogoPng({
      prompt: validated.prompt,
      style: validated.style,
      siteName,
    })

    await mkdir('uploads', { recursive: true })

    await Bun.write('uploads/logo.png', bytes)
    await Bun.write('uploads/favicon.png', bytes)

    const v = Date.now()
    const logoUrl = `/uploads/logo.png?v=${v}`
    const faviconUrl = `/uploads/favicon.png?v=${v}`

    await setSetting('logoUrl', JSON.stringify(logoUrl))
    await setSetting('faviconUrl', JSON.stringify(faviconUrl))

    return c.json({ success: true, data: { logoUrl, faviconUrl } })
  } catch (error) {
    console.error('Logo generation error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      500
    )
  }
})

// Generate + update a user's avatar (admin only)
aiRoutes.post('/users/:id/avatar', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const existing = await getUserById(id)
    if (!existing) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    const body = await c.req.json()
    const validated = aiAvatarSchema.parse(body)

    const bytes = await generateAvatarPng({
      prompt: validated.prompt,
      userName: existing.name,
    })

    await mkdir('uploads/avatars', { recursive: true })
    await Bun.write(`uploads/avatars/${id}.png`, bytes)

    const v = Date.now()
    const avatar = `/uploads/avatars/${id}.png?v=${v}`
    const updated = await updateUser(id, { avatar })

    return c.json({ success: true, data: { user: updated, avatarUrl: avatar } })
  } catch (error) {
    console.error('Avatar generation error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      500
    )
  }
})

// Generate article on demand
aiRoutes.post('/generate', requireRole('admin', 'editor'), async (c) => {
  try {
    const body = await c.req.json()
    const validated = aiGenerateSchema.parse(body)

    const result = await generateArticle({
      topic: validated.topic,
      keywords: validated.keywords,
      tone: validated.tone,
      length: validated.length,
      autoPublish: validated.autoPublish,
    })

    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Generation error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      500
    )
  }
})

// Get generation history
aiRoutes.get('/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    const history = await getGenerationHistory(limit)
    return c.json({ success: true, data: history })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch history' },
      500
    )
  }
})

// List all schedules
aiRoutes.get('/schedules', async (c) => {
  try {
    const schedules = await getAllSchedules()
    return c.json({ success: true, data: schedules })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch schedules' },
      500
    )
  }
})

// Get single schedule
aiRoutes.get('/schedules/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const schedule = await getScheduleById(id)

    if (!schedule) {
      return c.json({ success: false, error: 'Schedule not found' }, 404)
    }

    return c.json({ success: true, data: schedule })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch schedule' },
      500
    )
  }
})

// Create schedule
aiRoutes.post('/schedules', requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json()
    const validated = aiScheduleSchema.parse(body)

    const id = await createSchedule({
      name: validated.name,
      cron: validated.cron,
      topicPool: validated.topicPool,
      settings: validated.settings,
      enabled: validated.enabled,
    })

    const schedule = await getScheduleById(id)
    return c.json({ success: true, data: schedule }, 201)
  } catch (error) {
    console.error('Create schedule error:', error)
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create schedule' },
      500
    )
  }
})

// Update schedule
aiRoutes.put('/schedules/:id', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const existing = await getScheduleById(id)

    if (!existing) {
      return c.json({ success: false, error: 'Schedule not found' }, 404)
    }

    const body = await c.req.json()
    const validated = aiScheduleSchema.partial().parse(body)

    await updateSchedule(id, {
      name: validated.name,
      cron: validated.cron,
      topicPool: validated.topicPool,
      settings: validated.settings,
      enabled: validated.enabled,
    })

    const schedule = await getScheduleById(id)
    return c.json({ success: true, data: schedule })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update schedule' },
      500
    )
  }
})

// Delete schedule
aiRoutes.delete('/schedules/:id', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const existing = await getScheduleById(id)

    if (!existing) {
      return c.json({ success: false, error: 'Schedule not found' }, 404)
    }

    await deleteSchedule(id)
    return c.json({ success: true, data: { deleted: true } })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete schedule' },
      500
    )
  }
})

// Toggle schedule enabled/disabled
aiRoutes.post('/schedules/:id/toggle', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const existing = await getScheduleById(id)

    if (!existing) {
      return c.json({ success: false, error: 'Schedule not found' }, 404)
    }

    await updateSchedule(id, { enabled: !existing.enabled })

    const schedule = await getScheduleById(id)
    return c.json({ success: true, data: schedule })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to toggle schedule' },
      500
    )
  }
})

// Trigger schedule manually
aiRoutes.post('/schedules/:id/run', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const schedule = await getScheduleById(id)

    if (!schedule) {
      return c.json({ success: false, error: 'Schedule not found' }, 404)
    }

    // Pick a random topic from the pool
    const topic = schedule.topicPool.length > 0
      ? schedule.topicPool[Math.floor(Math.random() * schedule.topicPool.length)]
      : undefined

    const result = await generateArticle({
      topic: topic?.name,
      keywords: topic?.keywords,
      tone: schedule.settings.tone,
      length: schedule.settings.length,
      autoPublish: schedule.settings.autoPublish,
    })

    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run schedule' },
      500
    )
  }
})

export default aiRoutes
