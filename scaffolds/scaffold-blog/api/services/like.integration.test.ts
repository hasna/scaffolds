import { describe, expect, test } from 'bun:test'
import { run } from '../db'
import { getLikeStatus, likePost, unlikePost } from './like'
import { ensureSchema } from '../test/ensureSchema'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('like integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('like -> idempotent like -> unlike', async () => {
    await ensureSchema()
    const stamp = Date.now()
    const userId = `engine-blog-test-user-${stamp}`
    const postId = `engine-blog-test-post-${stamp}`
    const likeKey = `engine-blog-like-${stamp}`

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

      const initial = await getLikeStatus(postId, likeKey)
      expect(initial.likesCount).toBe(0)
      expect(initial.liked).toBe(false)

      const first = await likePost(postId, likeKey)
      expect(first.liked).toBe(true)
      expect(first.likesCount).toBe(1)

      const second = await likePost(postId, likeKey)
      expect(second.liked).toBe(true)
      expect(second.likesCount).toBe(1)

      const status = await getLikeStatus(postId, likeKey)
      expect(status.liked).toBe(true)
      expect(status.likesCount).toBe(1)

      const third = await unlikePost(postId, likeKey)
      expect(third.liked).toBe(false)
      expect(third.likesCount).toBe(0)

      const statusAfter = await getLikeStatus(postId, likeKey)
      expect(statusAfter.liked).toBe(false)
      expect(statusAfter.likesCount).toBe(0)
    } finally {
      await run('DELETE FROM posts WHERE id = $1', [postId])
      await run('DELETE FROM users WHERE id = $1', [userId])
    }
  }, 20000)
})
