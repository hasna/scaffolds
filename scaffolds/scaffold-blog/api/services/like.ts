import { findOne, transaction, generateId, now } from '../db'

export async function getLikeStatus(postId: string, likeKey?: string): Promise<{ likesCount: number; liked: boolean }> {
  const post = await findOne<{ status: string; likes_count: number }>('SELECT status, likes_count FROM posts WHERE id = $1', [postId])
  if (!post) throw new Error('Post not found')
  if (post.status !== 'published') throw new Error('Post not found')

  if (!likeKey) {
    return { likesCount: post.likes_count || 0, liked: false }
  }

  const existing = await findOne<{ id: string }>('SELECT id FROM post_likes WHERE post_id = $1 AND like_key = $2', [postId, likeKey])
  return { likesCount: post.likes_count || 0, liked: Boolean(existing) }
}

export async function likePost(postId: string, likeKey: string): Promise<{ likesCount: number; liked: boolean }> {
  return transaction(async (client) => {
    const post = await client.query<{ status: string; likes_count: number }>('SELECT status, likes_count FROM posts WHERE id = $1', [postId])
    const row = post.rows[0]
    if (!row) throw new Error('Post not found')
    if (row.status !== 'published') throw new Error('Post not found')

    const inserted = await client.query(
      'INSERT INTO post_likes (id, post_id, like_key, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (post_id, like_key) DO NOTHING',
      [generateId(), postId, likeKey, now()]
    )

    if ((inserted.rowCount || 0) > 0) {
      await client.query('UPDATE posts SET likes_count = GREATEST(COALESCE(likes_count, 0), 0) + 1 WHERE id = $1', [postId])
    }

    const updated = await client.query<{ likes_count: number }>('SELECT likes_count FROM posts WHERE id = $1', [postId])
    return { likesCount: updated.rows[0]?.likes_count || 0, liked: true }
  })
}

export async function unlikePost(postId: string, likeKey: string): Promise<{ likesCount: number; liked: boolean }> {
  return transaction(async (client) => {
    const post = await client.query<{ status: string; likes_count: number }>('SELECT status, likes_count FROM posts WHERE id = $1', [postId])
    const row = post.rows[0]
    if (!row) throw new Error('Post not found')
    if (row.status !== 'published') throw new Error('Post not found')

    const deleted = await client.query('DELETE FROM post_likes WHERE post_id = $1 AND like_key = $2', [postId, likeKey])
    if ((deleted.rowCount || 0) > 0) {
      await client.query('UPDATE posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = $1', [postId])
    }

    const updated = await client.query<{ likes_count: number }>('SELECT likes_count FROM posts WHERE id = $1', [postId])
    return { likesCount: updated.rows[0]?.likes_count || 0, liked: false }
  })
}
