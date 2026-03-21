import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { findOne, run } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import newsletterRoutes from './newsletter'
import { createToken } from '../middleware/auth'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('newsletter route integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('subscribe -> alreadySubscribed -> list -> delete', async () => {
    await ensureSchema()

    const stamp = Date.now()
    const adminId = `engine-blog-test-admin-${stamp}`
    const email = `engine-blog-test+${stamp}@example.com`
    const phone1 = '+1 555 101 0001'
    const phone2 = '+1 555 101 0002'

    const token = await createToken({
      id: adminId,
      email: `admin-${stamp}@example.com`,
      name: 'Admin',
      role: 'admin',
    })

    const app = new Hono()
    app.route('/api/newsletter', newsletterRoutes)

    try {
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [adminId, `admin-${stamp}@example.com`, 'test', 'Admin', 'admin']
      )

      const firstRes = await app.request('http://test/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone1 }),
      })
      expect(firstRes.status).toBe(200)
      const firstBody = await firstRes.json()
      expect(firstBody.success).toBe(true)
      expect(firstBody.data.subscribed).toBe(true)
      expect(firstBody.data.alreadySubscribed).toBe(false)

      const secondRes = await app.request('http://test/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone2 }),
      })
      expect(secondRes.status).toBe(200)
      const secondBody = await secondRes.json()
      expect(secondBody.success).toBe(true)
      expect(secondBody.data.alreadySubscribed).toBe(true)

      const stored = await findOne<{ id: string; phone: string | null }>(
        'SELECT id, phone FROM newsletter_subscribers WHERE email_lower = $1',
        [email.toLowerCase()]
      )
      expect(stored).toBeTruthy()
      expect(stored!.phone).toBe(phone2)

      const listRes = await app.request(`http://test/api/newsletter/subscribers?page=1&pageSize=50&search=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(listRes.status).toBe(200)
      const listBody = await listRes.json()
      expect(listBody.success).toBe(true)
      expect(listBody.data.data.some((s: any) => s.email.toLowerCase() === email.toLowerCase())).toBe(true)

      const deleteRes = await app.request(`http://test/api/newsletter/subscribers/${stored!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(deleteRes.status).toBe(200)

      const after = await findOne<{ id: string }>('SELECT id FROM newsletter_subscribers WHERE id = $1', [stored!.id])
      expect(after).toBeUndefined()
    } finally {
      await run('DELETE FROM newsletter_subscribers WHERE email_lower = $1', [email.toLowerCase()])
      await run('DELETE FROM users WHERE id = $1', [adminId])
    }
  }, 20000)
})

