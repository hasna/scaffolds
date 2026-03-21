import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { run } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import categoriesRoutes from './categories'
import tagsRoutes from './tags'
import { createToken } from '../middleware/auth'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('taxonomy routes integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('categories + tags list/create/delete', async () => {
    await ensureSchema()

    const stamp = Date.now()
    const adminId = `engine-blog-test-admin-${stamp}`
    const token = await createToken({
      id: adminId,
      email: `admin-${stamp}@example.com`,
      name: 'Admin',
      role: 'admin',
    })

    const app = new Hono()
    app.route('/api/categories', categoriesRoutes)
    app.route('/api/tags', tagsRoutes)

    let createdCategoryId: string | null = null
    let createdTagId: string | null = null

    try {
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [adminId, `admin-${stamp}@example.com`, 'test', 'Admin', 'admin']
      )

      const categoryName = `Category ${stamp}`
      const createCategoryRes = await app.request('http://test/api/categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName, description: 'Test category' }),
      })
      expect(createCategoryRes.status).toBe(200)
      const createCategoryBody = await createCategoryRes.json()
      expect(createCategoryBody.success).toBe(true)
      createdCategoryId = createCategoryBody.data.id

      const listCategoriesRes = await app.request('http://test/api/categories')
      expect(listCategoriesRes.status).toBe(200)
      const listCategoriesBody = await listCategoriesRes.json()
      expect(listCategoriesBody.success).toBe(true)
      expect(listCategoriesBody.data.some((c: any) => c.id === createdCategoryId)).toBe(true)

      const deleteCategoryRes = await app.request(`http://test/api/categories/${createdCategoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(deleteCategoryRes.status).toBe(200)

      const tagName = `Tag ${stamp}`
      const createTagRes = await app.request('http://test/api/tags', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: tagName }),
      })
      expect(createTagRes.status).toBe(200)
      const createTagBody = await createTagRes.json()
      expect(createTagBody.success).toBe(true)
      createdTagId = createTagBody.data.id

      const listTagsRes = await app.request('http://test/api/tags')
      expect(listTagsRes.status).toBe(200)
      const listTagsBody = await listTagsRes.json()
      expect(listTagsBody.success).toBe(true)
      expect(listTagsBody.data.some((t: any) => t.id === createdTagId)).toBe(true)

      const deleteTagRes = await app.request(`http://test/api/tags/${createdTagId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(deleteTagRes.status).toBe(200)
    } finally {
      if (createdCategoryId) await run('DELETE FROM categories WHERE id = $1', [createdCategoryId])
      if (createdTagId) await run('DELETE FROM tags WHERE id = $1', [createdTagId])
      await run('DELETE FROM users WHERE id = $1', [adminId])
    }
  }, 20000)
})

