import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { run } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import adminRoutes from './admin'
import { createToken } from '../middleware/auth'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('admin comments integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('GET /admin/comments + approve/reject/delete', async () => {
    await ensureSchema()

    const stamp = Date.now()
    const adminUserId = `engine-blog-test-admin-${stamp}`
    const authorUserId = `engine-blog-test-author-${stamp}`
    const postId = `engine-blog-test-post-${stamp}`
    const pendingCommentId = `engine-blog-test-comment-pending-${stamp}`
    const spamCommentId = `engine-blog-test-comment-spam-${stamp}`

    const app = new Hono()
    app.route('/api/admin', adminRoutes)

    const token = await createToken({
      id: adminUserId,
      email: `admin-${stamp}@example.com`,
      name: 'Admin',
      role: 'admin',
    })

    try {
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [adminUserId, `admin-${stamp}@example.com`, 'test', 'Admin', 'admin']
      )

      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [authorUserId, `author-${stamp}@example.com`, 'test', 'Author', 'author']
      )

      await run(
        `INSERT INTO posts (id, title, slug, content, status, author_id, likes_count, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW(), NOW())`,
        [postId, `Test Post ${stamp}`, `engine-blog-test-${stamp}`, 'Hello', 'published', authorUserId]
      )

      await run(
        `INSERT INTO comments (id, post_id, parent_id, author_name, author_email, content, status, created_at)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())`,
        [pendingCommentId, postId, 'Alice', `alice-${stamp}@example.com`, 'Pending', 'pending']
      )

      await run(
        `INSERT INTO comments (id, post_id, parent_id, author_name, author_email, content, status, created_at)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())`,
        [spamCommentId, postId, 'Bob', `bob-${stamp}@example.com`, 'Spam', 'spam']
      )

      const listRes = await app.request('http://test/api/admin/comments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(listRes.status).toBe(200)
      const listBody = await listRes.json()
      expect(listBody.success).toBe(true)
      expect(Array.isArray(listBody.data)).toBe(true)
      const pending = listBody.data.find((c: any) => c.id === pendingCommentId)
      expect(pending.status).toBe('pending')
      const rejected = listBody.data.find((c: any) => c.id === spamCommentId)
      expect(rejected.status).toBe('rejected')

      const approveRes = await app.request(`http://test/api/admin/comments/${pendingCommentId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(approveRes.status).toBe(200)

      const rejectRes = await app.request(`http://test/api/admin/comments/${pendingCommentId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(rejectRes.status).toBe(200)

      const deleteRes = await app.request(`http://test/api/admin/comments/${pendingCommentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(deleteRes.status).toBe(200)
    } finally {
      await run('DELETE FROM comments WHERE id = $1', [pendingCommentId])
      await run('DELETE FROM comments WHERE id = $1', [spamCommentId])
      await run('DELETE FROM posts WHERE id = $1', [postId])
      await run('DELETE FROM users WHERE id = $1', [authorUserId])
      await run('DELETE FROM users WHERE id = $1', [adminUserId])
    }
  }, 20000)
})

