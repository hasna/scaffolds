import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { run, findOne } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import postsRoutes from './posts'
import { createToken } from '../middleware/auth'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('posts route integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('public vs auth visibility + create/update/delete', async () => {
    await ensureSchema()

    const stamp = Date.now()
    const adminId = `engine-blog-test-admin-${stamp}`
    const authorId = `engine-blog-test-author-${stamp}`
    const otherAuthorId = `engine-blog-test-author2-${stamp}`
    const categoryId = `engine-blog-test-cat-${stamp}`
    const tagId = `engine-blog-test-tag-${stamp}`

    const app = new Hono()
    app.route('/api/posts', postsRoutes)

    const adminToken = await createToken({
      id: adminId,
      email: `admin-${stamp}@example.com`,
      name: 'Admin',
      role: 'admin',
    })
    const authorToken = await createToken({
      id: authorId,
      email: `author-${stamp}@example.com`,
      name: 'Author',
      role: 'author',
    })
    const otherAuthorToken = await createToken({
      id: otherAuthorId,
      email: `author2-${stamp}@example.com`,
      name: 'Author 2',
      role: 'author',
    })

    const createdPostIds: string[] = []

    try {
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [adminId, `admin-${stamp}@example.com`, 'test', 'Admin', 'admin']
      )
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [authorId, `author-${stamp}@example.com`, 'test', 'Author', 'author']
      )
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [otherAuthorId, `author2-${stamp}@example.com`, 'test', 'Author 2', 'author']
      )

      await run(
        `INSERT INTO categories (id, name, slug, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [categoryId, `Test Category ${stamp}`, `test-category-${stamp}`, 'Integration test category']
      )
      await run(
        `INSERT INTO tags (id, name, slug, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [tagId, `Test Tag ${stamp}`, `test-tag-${stamp}`]
      )

      // Create a published post as admin via route (should succeed)
      const createPublishedRes = await app.request('http://test/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Published Post ${stamp}`,
          content: 'Hello world',
          status: 'published',
          categoryIds: [categoryId],
          tagIds: [tagId],
        }),
      })
      expect(createPublishedRes.status).toBe(200)
      const createPublishedBody = await createPublishedRes.json()
      expect(createPublishedBody.success).toBe(true)
      expect(createPublishedBody.data.title).toContain('Published Post')
      expect(createPublishedBody.data.author?.name).toBe('Admin')
      const publishedPostId = createPublishedBody.data.id as string
      createdPostIds.push(publishedPostId)

      // Create a draft post directly for other author
      const draftOtherId = `engine-blog-test-draft-${stamp}`
      const draftOtherSlug = `draft-other-${stamp}`
      await run(
        `INSERT INTO posts (id, title, slug, content, status, author_id, likes_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'draft', $5, 0, NOW(), NOW())`,
        [draftOtherId, `Draft Other ${stamp}`, draftOtherSlug, 'Draft', otherAuthorId]
      )
      createdPostIds.push(draftOtherId)

      // Public list should only include published
      const publicListRes = await app.request('http://test/api/posts')
      expect(publicListRes.status).toBe(200)
      const publicListBody = await publicListRes.json()
      expect(publicListBody.success).toBe(true)
      expect(publicListBody.data.data.some((p: any) => p.id === publishedPostId)).toBe(true)
      expect(publicListBody.data.data.some((p: any) => p.id === draftOtherId)).toBe(false)

      // Auth list (admin) without includeUnpublished still forces published
      const adminListNoUnpubRes = await app.request('http://test/api/posts', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      expect(adminListNoUnpubRes.status).toBe(200)
      const adminListNoUnpubBody = await adminListNoUnpubRes.json()
      expect(adminListNoUnpubBody.success).toBe(true)
      expect(adminListNoUnpubBody.data.data.some((p: any) => p.id === draftOtherId)).toBe(false)

      // Auth list (admin) with includeUnpublished sees drafts
      const adminListRes = await app.request('http://test/api/posts?includeUnpublished=1', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      expect(adminListRes.status).toBe(200)
      const adminListBody = await adminListRes.json()
      expect(adminListBody.success).toBe(true)
      expect(adminListBody.data.data.some((p: any) => p.id === draftOtherId)).toBe(true)

      // Auth list (author) with includeUnpublished only sees their own
      const authorListRes = await app.request('http://test/api/posts?includeUnpublished=1', {
        headers: { Authorization: `Bearer ${authorToken}` },
      })
      expect(authorListRes.status).toBe(200)
      const authorListBody = await authorListRes.json()
      expect(authorListBody.success).toBe(true)
      expect(authorListBody.data.data.some((p: any) => p.id === draftOtherId)).toBe(false)

      // Category/tag filter should return the published post
      const categoryFilterRes = await app.request(`http://test/api/posts?categoryId=${encodeURIComponent(categoryId)}`)
      const categoryFilterBody = await categoryFilterRes.json()
      expect(categoryFilterBody.data.data.some((p: any) => p.id === publishedPostId)).toBe(true)

      const tagFilterRes = await app.request(`http://test/api/posts?tagId=${encodeURIComponent(tagId)}`)
      const tagFilterBody = await tagFilterRes.json()
      expect(tagFilterBody.data.data.some((p: any) => p.id === publishedPostId)).toBe(true)

      const searchRes = await app.request('http://test/api/posts?search=Hello')
      const searchBody = await searchRes.json()
      expect(searchBody.data.data.some((p: any) => p.id === publishedPostId)).toBe(true)

      // Draft slug should be hidden publicly
      const publicDraftRes = await app.request(`http://test/api/posts/${draftOtherSlug}`)
      expect(publicDraftRes.status).toBe(404)

      // Draft slug should be visible only with preview + auth; authors can only preview their own
      const otherAuthorPreviewRes = await app.request(`http://test/api/posts/${draftOtherSlug}?preview=1`, {
        headers: { Authorization: `Bearer ${otherAuthorToken}` },
      })
      expect(otherAuthorPreviewRes.status).toBe(200)

      const wrongAuthorPreviewRes = await app.request(`http://test/api/posts/${draftOtherSlug}?preview=1`, {
        headers: { Authorization: `Bearer ${authorToken}` },
      })
      expect(wrongAuthorPreviewRes.status).toBe(403)

      // Update should update slug when title changes
      const updateRes = await app.request(`http://test/api/posts/${publishedPostId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: `Renamed Post ${stamp}` }),
      })
      expect(updateRes.status).toBe(200)
      const updateBody = await updateRes.json()
      expect(updateBody.success).toBe(true)
      expect(updateBody.data.slug).toBe(`renamed-post-${stamp}`)

      // Delete should remove the post
      const deleteRes = await app.request(`http://test/api/posts/${publishedPostId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      expect(deleteRes.status).toBe(200)
      const deleted = await findOne<{ id: string }>('SELECT id FROM posts WHERE id = $1', [publishedPostId])
      expect(deleted).toBeUndefined()
    } finally {
      for (const id of createdPostIds) {
        await run('DELETE FROM posts WHERE id = $1', [id])
      }
      await run('DELETE FROM categories WHERE id = $1', [categoryId])
      await run('DELETE FROM tags WHERE id = $1', [tagId])
      await run('DELETE FROM users WHERE id = $1', [otherAuthorId])
      await run('DELETE FROM users WHERE id = $1', [authorId])
      await run('DELETE FROM users WHERE id = $1', [adminId])
    }
  }, 20000)
})

