import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { run } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import pagesRoutes from './pages'
import { createToken } from '../middleware/auth'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('pages route integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('nav pages + draft visibility', async () => {
    await ensureSchema()

    const stamp = Date.now()
    const publishedNavId = `engine-blog-test-page-nav-${stamp}`
    const publishedHiddenId = `engine-blog-test-page-hidden-${stamp}`
    const draftNavId = `engine-blog-test-page-draft-${stamp}`

    const publishedNavSlug = `nav-${stamp}`
    const draftSlug = `draft-${stamp}`

    const app = new Hono()
    app.route('/api/pages', pagesRoutes)

    const token = await createToken({
      id: `user-${stamp}`,
      email: `user-${stamp}@example.com`,
      name: 'User',
      role: 'author',
    })

    try {
      await run(
        `INSERT INTO pages (id, title, slug, content, status, show_in_nav, nav_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'published', true, 2, NOW(), NOW())`,
        [publishedNavId, `Nav Page ${stamp}`, publishedNavSlug, 'Hello']
      )

      await run(
        `INSERT INTO pages (id, title, slug, content, status, show_in_nav, nav_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'published', false, 1, NOW(), NOW())`,
        [publishedHiddenId, `Hidden Page ${stamp}`, `hidden-${stamp}`, 'Hidden']
      )

      await run(
        `INSERT INTO pages (id, title, slug, content, status, show_in_nav, nav_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'draft', true, 0, NOW(), NOW())`,
        [draftNavId, `Draft Page ${stamp}`, draftSlug, 'Draft']
      )

      const navRes = await app.request('http://test/api/pages/nav')
      expect(navRes.status).toBe(200)
      const navBody = await navRes.json()
      expect(navBody.success).toBe(true)
      expect(Array.isArray(navBody.data)).toBe(true)
      expect(navBody.data.some((p: any) => p.slug === publishedNavSlug)).toBe(true)
      expect(navBody.data.some((p: any) => p.slug === draftSlug)).toBe(false)
      expect(navBody.data.some((p: any) => p.slug === `hidden-${stamp}`)).toBe(false)

      const publicDraftRes = await app.request(`http://test/api/pages/${draftSlug}`)
      expect(publicDraftRes.status).toBe(404)

      const authedDraftRes = await app.request(`http://test/api/pages/${draftSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(authedDraftRes.status).toBe(200)
      const authedDraftBody = await authedDraftRes.json()
      expect(authedDraftBody.success).toBe(true)
      expect(authedDraftBody.data.slug).toBe(draftSlug)
    } finally {
      await run('DELETE FROM pages WHERE id = $1', [draftNavId])
      await run('DELETE FROM pages WHERE id = $1', [publishedHiddenId])
      await run('DELETE FROM pages WHERE id = $1', [publishedNavId])
    }
  }, 20000)
})

