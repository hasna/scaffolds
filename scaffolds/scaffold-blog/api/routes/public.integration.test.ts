import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { run } from '../db'
import { ensureSchema } from '../test/ensureSchema'
import postsRoutes from './posts'
import commentsRoutes from './comments'
import categoriesRoutes from './categories'
import tagsRoutes from './tags'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('public endpoints integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('top posts, top comments, category slug, tag slug', async () => {
    await ensureSchema()
    const stamp = Date.now()
    const userId = `engine-blog-test-user-${stamp}`
    const categoryId = `engine-blog-test-cat-${stamp}`
    const tagId = `engine-blog-test-tag-${stamp}`
    const postId = `engine-blog-test-post-${stamp}`
    const commentId = `engine-blog-test-comment-${stamp}`

    const postSlug = `engine-blog-test-${stamp}`
    const categorySlug = `engine-blog-cat-${stamp}`
    const tagSlug = `engine-blog-tag-${stamp}`

    const app = new Hono()
    app.route('/api/posts', postsRoutes)
    app.route('/api/comments', commentsRoutes)
    app.route('/api/categories', categoriesRoutes)
    app.route('/api/tags', tagsRoutes)

    try {
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, `engine-blog-test+${stamp}@example.com`, 'test', 'Test Author', 'author']
      )

      await run(
        `INSERT INTO categories (id, name, slug, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [categoryId, `Test Category ${stamp}`, categorySlug, 'Integration test category']
      )

      await run(
        `INSERT INTO tags (id, name, slug, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [tagId, `Test Tag ${stamp}`, tagSlug]
      )

      await run(
        `INSERT INTO posts (id, title, slug, content, status, author_id, likes_count, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW(), NOW())`,
        [postId, `Test Post ${stamp}`, postSlug, 'Hello', 'published', userId]
      )

      await run('INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2)', [postId, categoryId])
      await run('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [postId, tagId])

      await run(
        `INSERT INTO comments (id, post_id, parent_id, author_name, author_email, content, status, created_at)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())`,
        [commentId, postId, 'Commenter', `commenter-${stamp}@example.com`, 'Nice post!', 'approved']
      )

      const topPostsRes = await app.request(`http://test/api/posts/top?limit=10`)
      expect(topPostsRes.status).toBe(200)
      const topPostsBody = await topPostsRes.json()
      expect(topPostsBody.success).toBe(true)
      expect(Array.isArray(topPostsBody.data)).toBe(true)
      expect(topPostsBody.data.some((p: any) => p.slug === postSlug && p.authorName === 'Test Author')).toBe(true)

      const topCommentsRes = await app.request(`http://test/api/comments/top?limit=10`)
      expect(topCommentsRes.status).toBe(200)
      const topCommentsBody = await topCommentsRes.json()
      expect(topCommentsBody.success).toBe(true)
      expect(Array.isArray(topCommentsBody.data)).toBe(true)
      expect(
        topCommentsBody.data.some((c: any) => c.id === commentId && c.post?.slug === postSlug)
      ).toBe(true)

      const categoryRes = await app.request(`http://test/api/categories/${categorySlug}`)
      expect(categoryRes.status).toBe(200)
      const categoryBody = await categoryRes.json()
      expect(categoryBody.success).toBe(true)
      expect(categoryBody.data.slug).toBe(categorySlug)
      expect(categoryBody.data.posts.some((p: any) => p.slug === postSlug)).toBe(true)

      const tagRes = await app.request(`http://test/api/tags/${tagSlug}`)
      expect(tagRes.status).toBe(200)
      const tagBody = await tagRes.json()
      expect(tagBody.success).toBe(true)
      expect(tagBody.data.slug).toBe(tagSlug)
      expect(tagBody.data.posts.some((p: any) => p.slug === postSlug)).toBe(true)
    } finally {
      await run('DELETE FROM posts WHERE id = $1', [postId])
      await run('DELETE FROM categories WHERE id = $1', [categoryId])
      await run('DELETE FROM tags WHERE id = $1', [tagId])
      await run('DELETE FROM users WHERE id = $1', [userId])
    }
  }, 20000)
})
