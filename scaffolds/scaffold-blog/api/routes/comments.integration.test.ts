import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { findOne, run, now } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import commentsRoutes from './comments'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

async function getSettingRaw(key: string): Promise<string | null> {
  const row = await findOne<{ value: string }>('SELECT value FROM settings WHERE key = $1', [key])
  return row?.value ?? null
}

async function setSettingRaw(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [key, value, now()]
  )
}

async function restoreSettingRaw(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await run('DELETE FROM settings WHERE key = $1', [key])
    return
  }
  await setSettingRaw(key, value)
}

describe('comments route integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('POST /comments returns 403 when comments disabled', async () => {
    await ensureSchema()

    const stamp = Date.now()
    const userId = `engine-blog-test-user-${stamp}`
    const postId = `engine-blog-test-post-${stamp}`

    const originalAllow = await getSettingRaw('allowComments')

    const app = new Hono()
    app.route('/api/comments', commentsRoutes)

    try {
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, `engine-blog-test+${stamp}@example.com`, 'test', 'Test Author', 'author']
      )

      await run(
        `INSERT INTO posts (id, title, slug, content, status, author_id, likes_count, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW(), NOW())`,
        [postId, `Test Post ${stamp}`, `engine-blog-test-${stamp}`, 'Hello', 'published', userId]
      )

      await setSettingRaw('allowComments', 'false')

      const res = await app.request('http://test/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          authorName: 'Alice',
          authorEmail: `alice-${stamp}@example.com`,
          content: 'Hello',
        }),
      })

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Comments are disabled')
    } finally {
      await restoreSettingRaw('allowComments', originalAllow)
      await run('DELETE FROM comments WHERE post_id = $1', [postId])
      await run('DELETE FROM posts WHERE id = $1', [postId])
      await run('DELETE FROM users WHERE id = $1', [userId])
    }
  }, 20000)
})

